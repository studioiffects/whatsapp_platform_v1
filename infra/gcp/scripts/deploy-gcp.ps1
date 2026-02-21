param(
  [Parameter(Mandatory = $true)]
  [string]$ProjectId,

  [Parameter(Mandatory = $false)]
  [string]$Region = "us-central1",

  [Parameter(Mandatory = $false)]
  [string]$Environment = "prod",

  [Parameter(Mandatory = $true)]
  [string]$Domain,

  [Parameter(Mandatory = $false)]
  [string]$GithubRepository = "studioiffects/whatsapp_platform_v1",

  [Parameter(Mandatory = $false)]
  [string]$TerraformDir = "infra/gcp/terraform",

  [switch]$SkipGcloudLogin,
  [switch]$SkipGhLogin,
  [switch]$DryRun,
  [switch]$WhatIfDetailed,
  [string]$LogPath,
  [string]$SummaryPath
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if ($PSVersionTable.PSVersion.Major -ge 7) {
  $PSNativeCommandUseErrorActionPreference = $true
}

$script:ActionRecords = New-Object System.Collections.Generic.List[object]
$script:RunStartUtc = [DateTime]::UtcNow
$script:RunStatus = "running"
$script:RunErrorMessage = $null

if ($WhatIfDetailed -and -not $DryRun) {
  $DryRun = $true
}

function Require-Command {
  param([Parameter(Mandatory = $true)][string]$Name)
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Comando requerido no encontrado: $Name"
  }
}

function Write-Log {
  param(
    [Parameter(Mandatory = $true)][string]$Level,
    [Parameter(Mandatory = $true)][string]$Message
  )
  $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
  Write-Host "[$timestamp][$Level] $Message"
}

function Add-ActionRecord {
  param(
    [Parameter(Mandatory = $true)][hashtable]$Record
  )
  $script:ActionRecords.Add([ordered]@{
      timestamp_utc = ([DateTime]::UtcNow.ToString("o"))
      record        = $Record
    })
}

function Run-Native {
  param(
    [Parameter(Mandatory = $true)][string]$Description,
    [Parameter(Mandatory = $true)][string]$Exe,
    [Parameter(Mandatory = $false)][string[]]$Arguments = @(),
    [switch]$AllowNonZeroExit
  )

  Write-Log -Level "INFO" -Message $Description
  $commandPreview = "$Exe " + ($Arguments -join " ")
  Write-Log -Level "CMD" -Message $commandPreview

  $action = [ordered]@{
    type        = "command"
    description = $Description
    command     = $commandPreview
    dry_run     = [bool]$DryRun
    status      = "planned"
  }

  if ($DryRun) {
    Write-Log -Level "DRYRUN" -Message "Comando omitido."
    $action.status = "skipped"
    Add-ActionRecord -Record $action
    return
  }

  & $Exe @Arguments
  $exitCode = $LASTEXITCODE
  $action.exit_code = $exitCode
  if (-not $AllowNonZeroExit -and $null -ne $exitCode -and $exitCode -ne 0) {
    $action.status = "failed"
    Add-ActionRecord -Record $action
    throw "Comando fallo con codigo ${exitCode}: $commandPreview"
  }
  $action.status = "success"
  Add-ActionRecord -Record $action
}

function Set-GitHubSecret {
  param(
    [Parameter(Mandatory = $true)][string]$Name,
    [Parameter(Mandatory = $true)][string]$Value,
    [Parameter(Mandatory = $true)][string]$Repository
  )

  Write-Log -Level "INFO" -Message "Sincronizando secret GitHub: $Name"

  $action = [ordered]@{
    type        = "github_secret"
    secret_name = $Name
    repository  = $Repository
    dry_run     = [bool]$DryRun
    status      = "planned"
  }

  if ($DryRun) {
    Write-Log -Level "DRYRUN" -Message "Secret $Name no fue enviado a GitHub."
    $action.status = "skipped"
    Add-ActionRecord -Record $action
    return
  }

  & gh secret set $Name --repo $Repository --body $Value
  if ($LASTEXITCODE -ne 0) {
    $action.status = "failed"
    Add-ActionRecord -Record $action
    throw "Fallo al configurar secret GitHub: $Name"
  }
  $action.status = "success"
  Add-ActionRecord -Record $action
}

function Get-TerraformOutputRaw {
  param(
    [Parameter(Mandatory = $true)][string]$Name
  )

  $action = [ordered]@{
    type        = "terraform_output"
    output_name = $Name
    dry_run     = [bool]$DryRun
    status      = "planned"
  }

  if ($DryRun) {
    $placeholder = "__${Name.ToUpperInvariant()}__"
    Write-Log -Level "DRYRUN" -Message "Usando placeholder para terraform output '$Name': $placeholder"
    $action.status = "placeholder"
    Add-ActionRecord -Record $action
    return $placeholder
  }

  $value = terraform output -raw $Name 2>$null
  if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($value)) {
    $action.status = "failed"
    Add-ActionRecord -Record $action
    throw "No se pudo leer terraform output '$Name'. Ejecuta terraform apply antes."
  }
  $action.status = "success"
  Add-ActionRecord -Record $action
  return $value.Trim()
}

function Ensure-GcloudAuth {
  param([switch]$SkipLogin)
  $activeAccount = gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>$null
  if ([string]::IsNullOrWhiteSpace($activeAccount)) {
    if ($SkipLogin) {
      throw "No hay sesion activa en gcloud y se uso -SkipGcloudLogin."
    }

    if ($DryRun) {
      Write-Log -Level "DRYRUN" -Message "No hay sesion gcloud activa. Se omite gcloud auth login por DryRun."
      return
    }

    Run-Native -Description "Autenticando gcloud (cuenta interactiva)" -Exe "gcloud" -Arguments @("auth", "login")
    Run-Native -Description "Autenticando ADC para herramientas locales" -Exe "gcloud" -Arguments @("auth", "application-default", "login")
  }
}

function Ensure-GhAuth {
  param([switch]$SkipLogin)
  gh auth status 1>$null 2>$null
  if ($LASTEXITCODE -ne 0) {
    if ($SkipLogin) {
      throw "No hay sesion activa en gh y se uso -SkipGhLogin."
    }

    if ($DryRun) {
      Write-Log -Level "DRYRUN" -Message "No hay sesion gh activa. Se omite gh auth login por DryRun."
      return
    }

    Run-Native -Description "Autenticando GitHub CLI" -Exe "gh" -Arguments @("auth", "login")
  }
}

function Resolve-LogPath {
  param([string]$InputPath)
  $repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..\..")).Path

  if ([string]::IsNullOrWhiteSpace($InputPath)) {
    $logDir = Join-Path $repoRoot "infra\gcp\logs"
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
    $fileName = "deploy-gcp-{0}.log" -f (Get-Date -Format "yyyyMMdd-HHmmss")
    return Join-Path $logDir $fileName
  }

  if ([System.IO.Path]::IsPathRooted($InputPath)) {
    $targetDir = Split-Path -Path $InputPath -Parent
    if (-not [string]::IsNullOrWhiteSpace($targetDir)) {
      New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
    }
    return $InputPath
  }

  $resolved = Join-Path $repoRoot $InputPath
  $resolvedDir = Split-Path -Path $resolved -Parent
  if (-not [string]::IsNullOrWhiteSpace($resolvedDir)) {
    New-Item -ItemType Directory -Path $resolvedDir -Force | Out-Null
  }
  return $resolved
}

function Resolve-SummaryPath {
  param([string]$InputPath)
  $repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..\..")).Path

  if ([string]::IsNullOrWhiteSpace($InputPath)) {
    $summaryDir = Join-Path $repoRoot "infra\gcp\logs"
    New-Item -ItemType Directory -Path $summaryDir -Force | Out-Null
    $fileName = "deploy-gcp-summary-{0}.json" -f (Get-Date -Format "yyyyMMdd-HHmmss")
    return Join-Path $summaryDir $fileName
  }

  if ([System.IO.Path]::IsPathRooted($InputPath)) {
    $targetDir = Split-Path -Path $InputPath -Parent
    if (-not [string]::IsNullOrWhiteSpace($targetDir)) {
      New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
    }
    return $InputPath
  }

  $resolved = Join-Path $repoRoot $InputPath
  $resolvedDir = Split-Path -Path $resolved -Parent
  if (-not [string]::IsNullOrWhiteSpace($resolvedDir)) {
    New-Item -ItemType Directory -Path $resolvedDir -Force | Out-Null
  }
  return $resolved
}

$resolvedLogPath = Resolve-LogPath -InputPath $LogPath
$transcriptStarted = $false
$resolvedSummaryPath = $null
$writeSummary = $WhatIfDetailed -or -not [string]::IsNullOrWhiteSpace($SummaryPath)
if ($writeSummary) {
  $resolvedSummaryPath = Resolve-SummaryPath -InputPath $SummaryPath
}

try {
  Start-Transcript -Path $resolvedLogPath -Force | Out-Null
  $transcriptStarted = $true
  Write-Log -Level "INFO" -Message "Log de ejecucion: $resolvedLogPath"
  Write-Log -Level "INFO" -Message "Modo DryRun: $DryRun"
  Write-Log -Level "INFO" -Message "Modo WhatIfDetailed: $WhatIfDetailed"

  Write-Log -Level "INFO" -Message "Validando dependencias locales..."
  Require-Command "gcloud"
  Require-Command "kubectl"
  Require-Command "gh"
  Require-Command "terraform"

  Write-Log -Level "INFO" -Message "Paso 2: configurando variables y autenticacion GCP..."
  $env:PROJECT_ID = $ProjectId
  $env:REGION = $Region
  $env:ENVIRONMENT = $Environment
  $env:DOMAIN = $Domain
  $env:GITHUB_REPOSITORY = $GithubRepository

  Ensure-GcloudAuth -SkipLogin:$SkipGcloudLogin
  Run-Native -Description "Configurando proyecto activo en gcloud" -Exe "gcloud" -Arguments @("config", "set", "project", $env:PROJECT_ID)

  $terraformPath = Resolve-Path -Path $TerraformDir
  Push-Location $terraformPath
  try {
    Write-Log -Level "INFO" -Message "Paso 4: leyendo outputs de Terraform..."
    $env:WORKLOAD_IDENTITY_PROVIDER = Get-TerraformOutputRaw -Name "workload_identity_provider_name"
    $env:GCP_SERVICE_ACCOUNT = Get-TerraformOutputRaw -Name "gha_deployer_gsa_email"
    $env:IMAGE_API = Get-TerraformOutputRaw -Name "api_image_repository"
    $env:IMAGE_WEB = Get-TerraformOutputRaw -Name "web_image_repository"
    $env:GKE_CLUSTER = Get-TerraformOutputRaw -Name "gke_cluster_name"
    $env:GKE_REGION = Get-TerraformOutputRaw -Name "gke_cluster_location"
    $env:GKE_NAMESPACE = Get-TerraformOutputRaw -Name "gke_namespace"
    $env:GCP_SQL_INSTANCE_CONNECTION_NAME = Get-TerraformOutputRaw -Name "cloud_sql_connection_name"
    $env:GCP_STATIC_IP_NAME = Get-TerraformOutputRaw -Name "ingress_static_ip_name"
    $env:GSA_API = Get-TerraformOutputRaw -Name "api_runtime_gsa_email"
    $env:GSA_WEB = Get-TerraformOutputRaw -Name "web_runtime_gsa_email"
  }
  finally {
    Pop-Location
  }

  Write-Log -Level "INFO" -Message "Paso 5: obteniendo credenciales de GKE..."
  Run-Native -Description "Descargando credenciales del cluster GKE" -Exe "gcloud" -Arguments @(
    "container", "clusters", "get-credentials", $env:GKE_CLUSTER,
    "--region", $env:GKE_REGION,
    "--project", $env:PROJECT_ID
  )
  Run-Native -Description "Verificando nodos del cluster" -Exe "kubectl" -Arguments @("get", "nodes")

  Write-Log -Level "INFO" -Message "Paso 7: configurando GitHub Secrets del repositorio..."
  Ensure-GhAuth -SkipLogin:$SkipGhLogin

  $secretMap = @{
    "GCP_PROJECT_ID"                   = $env:PROJECT_ID
    "GCP_REGION"                       = $env:GKE_REGION
    "GKE_CLUSTER"                      = $env:GKE_CLUSTER
    "GKE_NAMESPACE"                    = $env:GKE_NAMESPACE
    "WORKLOAD_IDENTITY_PROVIDER"       = $env:WORKLOAD_IDENTITY_PROVIDER
    "GCP_SERVICE_ACCOUNT"              = $env:GCP_SERVICE_ACCOUNT
    "IMAGE_API"                        = $env:IMAGE_API
    "IMAGE_WEB"                        = $env:IMAGE_WEB
    "GCP_SQL_INSTANCE_CONNECTION_NAME" = $env:GCP_SQL_INSTANCE_CONNECTION_NAME
    "APP_DOMAIN"                       = $env:DOMAIN
    "GCP_STATIC_IP_NAME"               = $env:GCP_STATIC_IP_NAME
    "GSA_API"                          = $env:GSA_API
    "GSA_WEB"                          = $env:GSA_WEB
  }

  foreach ($entry in $secretMap.GetEnumerator()) {
    Set-GitHubSecret -Name $entry.Key -Value $entry.Value -Repository $env:GITHUB_REPOSITORY
  }

  Write-Host ""
  $script:RunStatus = "success"
  Write-Log -Level "INFO" -Message "Proceso completado."
  Write-Log -Level "INFO" -Message "Variables activas en la sesion:"
  Write-Log -Level "INFO" -Message "PROJECT_ID=$env:PROJECT_ID"
  Write-Log -Level "INFO" -Message "GKE_CLUSTER=$env:GKE_CLUSTER"
  Write-Log -Level "INFO" -Message "GKE_REGION=$env:GKE_REGION"
  Write-Log -Level "INFO" -Message "GKE_NAMESPACE=$env:GKE_NAMESPACE"
  Write-Log -Level "INFO" -Message "GITHUB_REPOSITORY=$env:GITHUB_REPOSITORY"
}
catch {
  $script:RunStatus = "failed"
  $script:RunErrorMessage = $_.Exception.Message
  Write-Log -Level "ERROR" -Message $_.Exception.Message
  throw
}
finally {
  if ($writeSummary) {
    $summary = [ordered]@{
      generated_at_utc = ([DateTime]::UtcNow.ToString("o"))
      started_at_utc   = $script:RunStartUtc.ToString("o")
      status           = $script:RunStatus
      error_message    = $script:RunErrorMessage
      mode             = [ordered]@{
        dry_run          = [bool]$DryRun
        what_if_detailed = [bool]$WhatIfDetailed
      }
      inputs           = [ordered]@{
        project_id         = $ProjectId
        region             = $Region
        environment        = $Environment
        domain             = $Domain
        github_repository  = $GithubRepository
        terraform_dir      = $TerraformDir
        skip_gcloud_login  = [bool]$SkipGcloudLogin
        skip_gh_login      = [bool]$SkipGhLogin
      }
      output_paths      = [ordered]@{
        log_path     = $resolvedLogPath
        summary_path = $resolvedSummaryPath
      }
      runtime_outputs    = [ordered]@{
        gke_cluster                      = $env:GKE_CLUSTER
        gke_region                       = $env:GKE_REGION
        gke_namespace                    = $env:GKE_NAMESPACE
        workload_identity_provider       = $env:WORKLOAD_IDENTITY_PROVIDER
        gcp_service_account              = $env:GCP_SERVICE_ACCOUNT
        image_api                        = $env:IMAGE_API
        image_web                        = $env:IMAGE_WEB
        gcp_sql_instance_connection_name = $env:GCP_SQL_INSTANCE_CONNECTION_NAME
        gcp_static_ip_name               = $env:GCP_STATIC_IP_NAME
        gsa_api                          = $env:GSA_API
        gsa_web                          = $env:GSA_WEB
      }
      actions = @($script:ActionRecords)
    }
    $summaryJson = $summary | ConvertTo-Json -Depth 10
    Set-Content -Path $resolvedSummaryPath -Value $summaryJson -Encoding UTF8
  }

  if ($transcriptStarted) {
    Stop-Transcript | Out-Null
  }
  Write-Host "Log guardado en: $resolvedLogPath"
  if ($writeSummary) {
    Write-Host "Resumen JSON guardado en: $resolvedSummaryPath"
  }
}
