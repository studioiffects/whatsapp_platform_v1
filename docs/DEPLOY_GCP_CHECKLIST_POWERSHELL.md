# Deploy GCP Checklist (PowerShell / Windows)

Repositorio objetivo:
1. `https://github.com/studioiffects/whatsapp_platform_v1`

Ruta de trabajo local:
1. `C:\develop\Whatsapp_Platformv1.0`

Fecha de referencia del runbook:
1. `2026-02-21`

## 1) Preflight local
Ejecutar:
```powershell
gcloud version
kubectl version --client
docker --version
git --version
gh --version
terraform version
```

Preflight automatizado recomendado:
```powershell
Set-Location C:\develop\Whatsapp_Platformv1.0
powershell -ExecutionPolicy Bypass -File .\infra\gcp\scripts\preflight-gcp-tools.ps1 `
  -ProjectId "tu-project-id"
```

Opcional (si aun no has autenticado y solo quieres validar binarios/versiones):
```powershell
powershell -ExecutionPolicy Bypass -File .\infra\gcp\scripts\preflight-gcp-tools.ps1 `
  -ProjectId "tu-project-id" `
  -SkipAuthChecks
```

Debes tener:
1. `gcloud`, `kubectl`, `docker`, `gh`, `terraform` instalados.
2. Permisos GCP suficientes en el proyecto.
3. Permisos admin del repo en GitHub para crear secrets.

## 2) Variables base del despliegue
Configurar variables:
```powershell
$env:PROJECT_ID = "tu-project-id"
$env:REGION = "us-central1"
$env:ENVIRONMENT = "prod"
$env:DOMAIN = "app.tu-dominio.com"
$env:DNS_MANAGED_ZONE = "tu-managed-zone"
$env:GITHUB_REPOSITORY = "studioiffects/whatsapp_platform_v1"
```

Autenticacion GCP:
```powershell
gcloud auth login
gcloud auth application-default login
gcloud config set project $env:PROJECT_ID
```

Automatizacion recomendada de pasos 2, 4, 5 y 7:
```powershell
Set-Location C:\develop\Whatsapp_Platformv1.0
powershell -ExecutionPolicy Bypass -File .\infra\gcp\scripts\deploy-gcp.ps1 `
  -ProjectId "tu-project-id" `
  -Region "us-central1" `
  -Environment "prod" `
  -Domain "app.tu-dominio.com" `
  -GithubRepository "studioiffects/whatsapp_platform_v1"
```

Modo simulacion (no ejecuta cambios, solo imprime comandos):
```powershell
powershell -ExecutionPolicy Bypass -File .\infra\gcp\scripts\deploy-gcp.ps1 `
  -ProjectId "tu-project-id" `
  -Domain "app.tu-dominio.com" `
  -DryRun
```

Modo `WhatIfDetailed` (activa `DryRun` y exporta resumen JSON):
```powershell
powershell -ExecutionPolicy Bypass -File .\infra\gcp\scripts\deploy-gcp.ps1 `
  -ProjectId "tu-project-id" `
  -Domain "app.tu-dominio.com" `
  -WhatIfDetailed
```

Log detallado en ruta personalizada:
```powershell
powershell -ExecutionPolicy Bypass -File .\infra\gcp\scripts\deploy-gcp.ps1 `
  -ProjectId "tu-project-id" `
  -Domain "app.tu-dominio.com" `
  -LogPath "C:\deploy-logs\deploy-gcp.log"
```

Resumen JSON en ruta personalizada:
```powershell
powershell -ExecutionPolicy Bypass -File .\infra\gcp\scripts\deploy-gcp.ps1 `
  -ProjectId "tu-project-id" `
  -Domain "app.tu-dominio.com" `
  -WhatIfDetailed `
  -SummaryPath "C:\deploy-logs\deploy-gcp-summary.json"
```

Notas del script:
1. Si no pasas `-LogPath`, guarda el log en `infra/gcp/logs/deploy-gcp-YYYYMMDD-HHMMSS.log`.
2. En `-DryRun`, no ejecuta login, no modifica kubeconfig y no actualiza secrets de GitHub.
3. `-WhatIfDetailed` fuerza `-DryRun` y genera JSON con: estado, inputs, outputs runtime y acciones planificadas/ejecutadas.

## 3) Bootstrap IaC con Terraform
```powershell
Set-Location C:\develop\Whatsapp_Platformv1.0\infra\gcp\terraform
Copy-Item terraform.tfvars.example terraform.tfvars
```

Editar `terraform.tfvars` minimo:
1. `project_id`
2. `region`
3. `environment`
4. `domain`
5. `dns_managed_zone`
6. `github_repository`

Plan y apply:
```powershell
terraform init
terraform validate
terraform fmt -recursive
terraform plan -out=tfplan
terraform apply tfplan
```

## 4) Capturar outputs clave
```powershell
$env:WORKLOAD_IDENTITY_PROVIDER = terraform output -raw workload_identity_provider_name
$env:GCP_SERVICE_ACCOUNT = terraform output -raw gha_deployer_gsa_email
$env:IMAGE_API = terraform output -raw api_image_repository
$env:IMAGE_WEB = terraform output -raw web_image_repository
$env:GKE_CLUSTER = terraform output -raw gke_cluster_name
$env:GKE_REGION = terraform output -raw gke_cluster_location
$env:GKE_NAMESPACE = terraform output -raw gke_namespace
$env:GCP_SQL_INSTANCE_CONNECTION_NAME = terraform output -raw cloud_sql_connection_name
$env:GCP_STATIC_IP_NAME = terraform output -raw ingress_static_ip_name
$env:GSA_API = terraform output -raw api_runtime_gsa_email
$env:GSA_WEB = terraform output -raw web_runtime_gsa_email
```

Verificar:
```powershell
terraform output
```

## 5) Preparar acceso a GKE
```powershell
gcloud container clusters get-credentials $env:GKE_CLUSTER --region $env:GKE_REGION --project $env:PROJECT_ID
kubectl get nodes
```

## 6) Crear secrets Kubernetes de aplicacion
Obtener secretos desde Secret Manager:
```powershell
$env:JWT_SECRET = gcloud secrets versions access latest --secret="wa-$($env:ENVIRONMENT)-jwt-secret" --project $env:PROJECT_ID
$env:NEXTAUTH_SECRET = gcloud secrets versions access latest --secret="wa-$($env:ENVIRONMENT)-nextauth-secret" --project $env:PROJECT_ID
$env:SQL_PASSWORD = gcloud secrets versions access latest --secret="wa-$($env:ENVIRONMENT)-sql-password" --project $env:PROJECT_ID
```

Aplicar secrets:
```powershell
Set-Location C:\develop\Whatsapp_Platformv1.0
bash infra/gcp/scripts/apply-k8s-secrets.sh `
  $env:GKE_NAMESPACE `
  $env:DOMAIN `
  "wa_app_user" `
  $env:SQL_PASSWORD `
  "whatsapp_platform" `
  $env:JWT_SECRET `
  $env:NEXTAUTH_SECRET
```

Nota:
1. El comando anterior requiere `bash` (Git Bash o WSL). Si no lo tienes, crea los secrets con `kubectl create secret ...` en PowerShell manualmente.

## 7) Configurar GitHub Secrets para CI/CD
Autenticacion GH:
```powershell
gh auth login
```

Cargar secrets:
```powershell
gh secret set GCP_PROJECT_ID --repo $env:GITHUB_REPOSITORY --body "$env:PROJECT_ID"
gh secret set GCP_REGION --repo $env:GITHUB_REPOSITORY --body "$env:GKE_REGION"
gh secret set GKE_CLUSTER --repo $env:GITHUB_REPOSITORY --body "$env:GKE_CLUSTER"
gh secret set GKE_NAMESPACE --repo $env:GITHUB_REPOSITORY --body "$env:GKE_NAMESPACE"
gh secret set WORKLOAD_IDENTITY_PROVIDER --repo $env:GITHUB_REPOSITORY --body "$env:WORKLOAD_IDENTITY_PROVIDER"
gh secret set GCP_SERVICE_ACCOUNT --repo $env:GITHUB_REPOSITORY --body "$env:GCP_SERVICE_ACCOUNT"
gh secret set IMAGE_API --repo $env:GITHUB_REPOSITORY --body "$env:IMAGE_API"
gh secret set IMAGE_WEB --repo $env:GITHUB_REPOSITORY --body "$env:IMAGE_WEB"
gh secret set GCP_SQL_INSTANCE_CONNECTION_NAME --repo $env:GITHUB_REPOSITORY --body "$env:GCP_SQL_INSTANCE_CONNECTION_NAME"
gh secret set APP_DOMAIN --repo $env:GITHUB_REPOSITORY --body "$env:DOMAIN"
gh secret set GCP_STATIC_IP_NAME --repo $env:GITHUB_REPOSITORY --body "$env:GCP_STATIC_IP_NAME"
gh secret set GSA_API --repo $env:GITHUB_REPOSITORY --body "$env:GSA_API"
gh secret set GSA_WEB --repo $env:GITHUB_REPOSITORY --body "$env:GSA_WEB"
```

## 8) Ejecutar primera migracion SQL
Terminal 1:
```powershell
cloud-sql-proxy.exe --private-ip $env:GCP_SQL_INSTANCE_CONNECTION_NAME
```

Terminal 2:
```powershell
$env:DATABASE_URL = "postgresql://wa_app_user:$($env:SQL_PASSWORD)@127.0.0.1:5432/whatsapp_platform?schema=public"
psql $env:DATABASE_URL -f C:\develop\Whatsapp_Platformv1.0\packages\db\prisma\migrations\20260219_init\migration.sql
psql $env:DATABASE_URL -f C:\develop\Whatsapp_Platformv1.0\packages\db\prisma\seeds\001_initial_seed.sql
```

## 9) Lanzar deploy desde GitHub Actions
Opcion UI:
1. GitHub Actions -> `Deploy GCP` -> `Run workflow`.
2. Si `preflight` falla, descarga el artefacto `preflight-report` en la misma ejecucion.

Opcion CLI:
```powershell
gh workflow run "Deploy GCP" --repo $env:GITHUB_REPOSITORY
gh run list --workflow "Deploy GCP" --repo $env:GITHUB_REPOSITORY --limit 5
```

## 10) Validacion post-deploy
```powershell
kubectl -n $env:GKE_NAMESPACE get pods
kubectl -n $env:GKE_NAMESPACE get svc
kubectl -n $env:GKE_NAMESPACE get ingress
kubectl -n $env:GKE_NAMESPACE rollout status deployment/whatsapp-api --timeout=300s
kubectl -n $env:GKE_NAMESPACE rollout status deployment/whatsapp-web --timeout=300s
```

Smoke tests:
```powershell
curl.exe -I "https://$($env:DOMAIN)/login"
curl.exe "https://$($env:DOMAIN)/api/v1/health"
```

## 11) Rollback rapido
```powershell
kubectl -n $env:GKE_NAMESPACE rollout history deployment/whatsapp-api
kubectl -n $env:GKE_NAMESPACE rollout history deployment/whatsapp-web

kubectl -n $env:GKE_NAMESPACE rollout undo deployment/whatsapp-api
kubectl -n $env:GKE_NAMESPACE rollout undo deployment/whatsapp-web

kubectl -n $env:GKE_NAMESPACE rollout status deployment/whatsapp-api --timeout=300s
kubectl -n $env:GKE_NAMESPACE rollout status deployment/whatsapp-web --timeout=300s
```

## 12) Operacion diaria
Logs:
```powershell
kubectl -n $env:GKE_NAMESPACE logs deploy/whatsapp-api --tail=200
kubectl -n $env:GKE_NAMESPACE logs deploy/whatsapp-web --tail=200
```

Escalado temporal web:
```powershell
kubectl -n $env:GKE_NAMESPACE scale deploy/whatsapp-web --replicas=4
```

Nota:
1. Mantener `whatsapp-api` en 1 replica mientras exista estado en memoria (`InMemoryStore`).
