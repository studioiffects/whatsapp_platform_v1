param(
  [string]$ProjectId,
  [string]$MinGcloudVersion = "460.0.0",
  [string]$MinGhVersion = "2.40.0",
  [string]$MinTerraformVersion = "1.6.0",
  [string]$MinKubectlVersion = "1.28.0",
  [switch]$SkipAuthChecks
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$results = New-Object System.Collections.Generic.List[object]

function Add-Result {
  param(
    [Parameter(Mandatory = $true)][string]$Check,
    [Parameter(Mandatory = $true)][string]$Status,
    [Parameter(Mandatory = $true)][string]$Details,
    [string]$Hint = ""
  )
  $results.Add([PSCustomObject]@{
      Check   = $Check
      Status  = $Status
      Details = $Details
      Hint    = $Hint
    })
}

function Try-Command {
  param(
    [Parameter(Mandatory = $true)][string]$FilePath,
    [Parameter(Mandatory = $false)][string[]]$Arguments = @()
  )
  try {
    $output = & $FilePath @Arguments 2>&1
    return @{
      ok       = ($LASTEXITCODE -eq 0)
      output   = ($output | Out-String).Trim()
      exitCode = $LASTEXITCODE
    }
  }
  catch {
    return @{
      ok       = $false
      output   = $_.Exception.Message
      exitCode = 1
    }
  }
}

function Get-VersionFromText {
  param(
    [Parameter(Mandatory = $true)][string]$Text,
    [Parameter(Mandatory = $true)][string]$Pattern
  )
  $m = [regex]::Match($Text, $Pattern)
  if ($m.Success) { return $m.Groups[1].Value }
  return $null
}

function Compare-VersionAtLeast {
  param(
    [Parameter(Mandatory = $true)][string]$Current,
    [Parameter(Mandatory = $true)][string]$Minimum
  )
  try {
    return ([version]$Current -ge [version]$Minimum)
  }
  catch {
    return $false
  }
}

function Check-Tool {
  param(
    [Parameter(Mandatory = $true)][string]$Name,
    [Parameter(Mandatory = $true)][string]$VersionCommand,
    [Parameter(Mandatory = $true)][string]$VersionPattern,
    [Parameter(Mandatory = $true)][string]$MinimumVersion,
    [string]$InstallHint
  )

  $cmd = Get-Command $Name -ErrorAction SilentlyContinue
  if (-not $cmd) {
    Add-Result -Check "$Name instalado" -Status "FAIL" -Details "No encontrado en PATH." -Hint $InstallHint
    return
  }

  Add-Result -Check "$Name instalado" -Status "PASS" -Details $cmd.Source

  $parts = $VersionCommand.Split(" ")
  $exe = $parts[0]
  $args = @()
  if ($parts.Count -gt 1) { $args = $parts[1..($parts.Count - 1)] }

  $res = Try-Command -FilePath $exe -Arguments $args
  if (-not $res.ok) {
    Add-Result -Check "$Name version" -Status "FAIL" -Details "No se pudo leer version: $($res.output)" -Hint "Verifica instalacion de $Name."
    return
  }

  $version = Get-VersionFromText -Text $res.output -Pattern $VersionPattern
  if (-not $version) {
    Add-Result -Check "$Name version parse" -Status "WARN" -Details "No se pudo parsear version desde salida: $($res.output)"
    return
  }

  if (Compare-VersionAtLeast -Current $version -Minimum $MinimumVersion) {
    Add-Result -Check "$Name version" -Status "PASS" -Details "$version (minimo: $MinimumVersion)"
  }
  else {
    Add-Result -Check "$Name version" -Status "FAIL" -Details "$version (minimo: $MinimumVersion)" -Hint "Actualiza $Name."
  }
}

Write-Host "Ejecutando preflight de herramientas GCP..." -ForegroundColor Cyan

Check-Tool -Name "gcloud" `
  -VersionCommand "gcloud version" `
  -VersionPattern "Google Cloud SDK\s+([0-9]+\.[0-9]+\.[0-9]+)" `
  -MinimumVersion $MinGcloudVersion `
  -InstallHint "winget install --id Google.CloudSDK --source winget"

Check-Tool -Name "gh" `
  -VersionCommand "gh --version" `
  -VersionPattern "gh version\s+([0-9]+\.[0-9]+\.[0-9]+)" `
  -MinimumVersion $MinGhVersion `
  -InstallHint "winget install --id GitHub.cli --source winget"

Check-Tool -Name "terraform" `
  -VersionCommand "terraform version" `
  -VersionPattern "Terraform v([0-9]+\.[0-9]+\.[0-9]+)" `
  -MinimumVersion $MinTerraformVersion `
  -InstallHint "winget install --id Hashicorp.Terraform --source winget"

Check-Tool -Name "kubectl" `
  -VersionCommand "kubectl version --client --output=yaml" `
  -VersionPattern "gitVersion:\s*v([0-9]+\.[0-9]+\.[0-9]+)" `
  -MinimumVersion $MinKubectlVersion `
  -InstallHint "gcloud components install kubectl"

$pluginCmd = Get-Command "gke-gcloud-auth-plugin" -ErrorAction SilentlyContinue
if ($pluginCmd) {
  Add-Result -Check "gke-gcloud-auth-plugin" -Status "PASS" -Details $pluginCmd.Source
}
else {
  Add-Result -Check "gke-gcloud-auth-plugin" -Status "WARN" -Details "No encontrado en PATH." -Hint "gcloud components install gke-gcloud-auth-plugin"
}

if ($env:USE_GKE_GCLOUD_AUTH_PLUGIN -eq "True") {
  Add-Result -Check "USE_GKE_GCLOUD_AUTH_PLUGIN" -Status "PASS" -Details "True"
}
else {
  Add-Result -Check "USE_GKE_GCLOUD_AUTH_PLUGIN" -Status "WARN" -Details "No definido en True." -Hint '$env:USE_GKE_GCLOUD_AUTH_PLUGIN="True"'
}

if (-not $SkipAuthChecks) {
  $gcloudActive = Try-Command -FilePath "gcloud" -Arguments @("auth", "list", "--filter=status:ACTIVE", "--format=value(account)")
  if ($gcloudActive.ok -and -not [string]::IsNullOrWhiteSpace($gcloudActive.output)) {
    Add-Result -Check "gcloud auth" -Status "PASS" -Details "Cuenta activa: $($gcloudActive.output)"
  }
  else {
    Add-Result -Check "gcloud auth" -Status "FAIL" -Details "Sin cuenta activa." -Hint "gcloud auth login"
  }

  $adc = Try-Command -FilePath "gcloud" -Arguments @("auth", "application-default", "print-access-token")
  if ($adc.ok -and -not [string]::IsNullOrWhiteSpace($adc.output)) {
    Add-Result -Check "gcloud ADC" -Status "PASS" -Details "Application Default Credentials disponibles."
  }
  else {
    Add-Result -Check "gcloud ADC" -Status "FAIL" -Details "ADC no disponible." -Hint "gcloud auth application-default login"
  }

  $ghAuth = Try-Command -FilePath "gh" -Arguments @("auth", "status")
  if ($ghAuth.ok) {
    Add-Result -Check "gh auth" -Status "PASS" -Details "Sesion activa."
  }
  else {
    Add-Result -Check "gh auth" -Status "FAIL" -Details "Sin sesion activa en GitHub CLI." -Hint "gh auth login"
  }
}
else {
  Add-Result -Check "Auth checks" -Status "WARN" -Details "Omitidos por parametro -SkipAuthChecks"
}

if (-not [string]::IsNullOrWhiteSpace($ProjectId)) {
  $activeProject = Try-Command -FilePath "gcloud" -Arguments @("config", "get-value", "project")
  if ($activeProject.ok) {
    $project = $activeProject.output.Trim()
    if ($project -eq $ProjectId) {
      Add-Result -Check "gcloud project activo" -Status "PASS" -Details $project
    }
    else {
      Add-Result -Check "gcloud project activo" -Status "WARN" -Details "Actual: $project / Esperado: $ProjectId" -Hint "gcloud config set project $ProjectId"
    }
  }
}

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..\..")
$requiredPaths = @(
  "infra/gcp/terraform/versions.tf",
  "infra/gcp/k8s/ingress.yaml",
  ".github/workflows/deploy-gcp.yml"
)

foreach ($p in $requiredPaths) {
  $fullPath = Join-Path $repoRoot $p
  if (Test-Path $fullPath) {
    Add-Result -Check "Path requerido" -Status "PASS" -Details $p
  }
  else {
    Add-Result -Check "Path requerido" -Status "FAIL" -Details "$p no existe." -Hint "Verifica que estas en la raiz del repo correcto."
  }
}

Write-Host ""
Write-Host "Resultado preflight" -ForegroundColor Cyan
$results | Format-Table -AutoSize

$failCount = ($results | Where-Object { $_.Status -eq "FAIL" }).Count
$warnCount = ($results | Where-Object { $_.Status -eq "WARN" }).Count

Write-Host ""
Write-Host "Resumen: FAIL=$failCount WARN=$warnCount TOTAL=$($results.Count)"

if ($failCount -gt 0) {
  Write-Host "Preflight fallido. Corrige los FAIL antes de desplegar." -ForegroundColor Red
  exit 1
}

if ($warnCount -gt 0) {
  Write-Host "Preflight con advertencias. Puedes continuar con cautela." -ForegroundColor Yellow
  exit 0
}

Write-Host "Preflight OK. Entorno listo para deploy." -ForegroundColor Green
exit 0
