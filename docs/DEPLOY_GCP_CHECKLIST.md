# Deploy GCP Checklist (Ejecutable)

Repositorio objetivo:
1. `https://github.com/studioiffects/whatsapp_platform_v1`

Ruta de trabajo local:
1. `C:\develop\Whatsapp_Platformv1.0`

Fecha de referencia del runbook:
1. `2026-02-21`

## 1) Preflight local
Ejecutar:
```bash
gcloud version
kubectl version --client
docker --version
git --version
gh --version
terraform version
```

Debes tener:
1. `gcloud`, `kubectl`, `docker`, `gh`, `terraform` instalados.
2. Permisos GCP (Project Owner o permisos equivalentes de red/GKE/SQL/IAM/Artifact Registry/Secret Manager/DNS).
3. Permisos admin del repo en GitHub para crear secrets.

## 2) Variables base del despliegue
Exporta variables (ajusta valores reales):
```bash
export PROJECT_ID="tu-project-id"
export REGION="us-central1"
export ENVIRONMENT="prod"
export DOMAIN="app.tu-dominio.com"
export DNS_MANAGED_ZONE="tu-managed-zone"
export GITHUB_REPOSITORY="studioiffects/whatsapp_platform_v1"
```

Autenticacion GCP:
```bash
gcloud auth login
gcloud auth application-default login
gcloud config set project "${PROJECT_ID}"
```

## 3) Bootstrap IaC con Terraform
Ir al directorio Terraform:
```bash
cd infra/gcp/terraform
cp terraform.tfvars.example terraform.tfvars
```

Editar `terraform.tfvars` minimo:
1. `project_id`
2. `region`
3. `environment`
4. `domain`
5. `dns_managed_zone` (si usaras Cloud DNS)
6. `github_repository`

Plan y apply:
```bash
terraform init
terraform validate
terraform fmt -recursive
terraform plan -out=tfplan
terraform apply tfplan
```

## 4) Capturar outputs clave
```bash
export WORKLOAD_IDENTITY_PROVIDER="$(terraform output -raw workload_identity_provider_name)"
export GCP_SERVICE_ACCOUNT="$(terraform output -raw gha_deployer_gsa_email)"
export IMAGE_API="$(terraform output -raw api_image_repository)"
export IMAGE_WEB="$(terraform output -raw web_image_repository)"
export GKE_CLUSTER="$(terraform output -raw gke_cluster_name)"
export GKE_REGION="$(terraform output -raw gke_cluster_location)"
export GKE_NAMESPACE="$(terraform output -raw gke_namespace)"
export GCP_SQL_INSTANCE_CONNECTION_NAME="$(terraform output -raw cloud_sql_connection_name)"
export GCP_STATIC_IP_NAME="$(terraform output -raw ingress_static_ip_name)"
export GSA_API="$(terraform output -raw api_runtime_gsa_email)"
export GSA_WEB="$(terraform output -raw web_runtime_gsa_email)"
```

Verificar outputs:
```bash
terraform output
```

## 5) Preparar acceso a GKE
```bash
gcloud container clusters get-credentials "${GKE_CLUSTER}" --region "${GKE_REGION}" --project "${PROJECT_ID}"
kubectl get nodes
```

## 6) Crear secrets Kubernetes de aplicacion
Obtener secretos de Secret Manager:
```bash
export JWT_SECRET="$(gcloud secrets versions access latest --secret=wa-${ENVIRONMENT}-jwt-secret --project ${PROJECT_ID})"
export NEXTAUTH_SECRET="$(gcloud secrets versions access latest --secret=wa-${ENVIRONMENT}-nextauth-secret --project ${PROJECT_ID})"
export SQL_PASSWORD="$(gcloud secrets versions access latest --secret=wa-${ENVIRONMENT}-sql-password --project ${PROJECT_ID})"
```

Aplicar secrets en cluster:
```bash
bash infra/gcp/scripts/apply-k8s-secrets.sh \
  "${GKE_NAMESPACE}" \
  "${DOMAIN}" \
  "wa_app_user" \
  "${SQL_PASSWORD}" \
  "whatsapp_platform" \
  "${JWT_SECRET}" \
  "${NEXTAUTH_SECRET}"
```

## 7) Configurar GitHub Secrets para CI/CD
Autenticacion gh:
```bash
gh auth login
```

Crear/actualizar secrets del repo:
```bash
gh secret set GCP_PROJECT_ID --repo "${GITHUB_REPOSITORY}" --body "${PROJECT_ID}"
gh secret set GCP_REGION --repo "${GITHUB_REPOSITORY}" --body "${GKE_REGION}"
gh secret set GKE_CLUSTER --repo "${GITHUB_REPOSITORY}" --body "${GKE_CLUSTER}"
gh secret set GKE_NAMESPACE --repo "${GITHUB_REPOSITORY}" --body "${GKE_NAMESPACE}"
gh secret set WORKLOAD_IDENTITY_PROVIDER --repo "${GITHUB_REPOSITORY}" --body "${WORKLOAD_IDENTITY_PROVIDER}"
gh secret set GCP_SERVICE_ACCOUNT --repo "${GITHUB_REPOSITORY}" --body "${GCP_SERVICE_ACCOUNT}"
gh secret set IMAGE_API --repo "${GITHUB_REPOSITORY}" --body "${IMAGE_API}"
gh secret set IMAGE_WEB --repo "${GITHUB_REPOSITORY}" --body "${IMAGE_WEB}"
gh secret set GCP_SQL_INSTANCE_CONNECTION_NAME --repo "${GITHUB_REPOSITORY}" --body "${GCP_SQL_INSTANCE_CONNECTION_NAME}"
gh secret set APP_DOMAIN --repo "${GITHUB_REPOSITORY}" --body "${DOMAIN}"
gh secret set GCP_STATIC_IP_NAME --repo "${GITHUB_REPOSITORY}" --body "${GCP_STATIC_IP_NAME}"
gh secret set GSA_API --repo "${GITHUB_REPOSITORY}" --body "${GSA_API}"
gh secret set GSA_WEB --repo "${GITHUB_REPOSITORY}" --body "${GSA_WEB}"
```

## 8) Ejecutar primera migracion SQL
Inicia Cloud SQL Proxy local (nueva terminal):
```bash
cloud-sql-proxy --private-ip "${GCP_SQL_INSTANCE_CONNECTION_NAME}"
```

En otra terminal:
```bash
export DATABASE_URL="postgresql://wa_app_user:${SQL_PASSWORD}@127.0.0.1:5432/whatsapp_platform?schema=public"
psql "${DATABASE_URL}" -f packages/db/prisma/migrations/20260219_init/migration.sql
psql "${DATABASE_URL}" -f packages/db/prisma/seeds/001_initial_seed.sql
```

## 9) Lanzar deploy desde GitHub Actions
Workflow a ejecutar:
1. `.github/workflows/deploy-gcp.yml`
2. Si `preflight` falla, descarga el artefacto `preflight-report` desde la ejecucion en GitHub Actions.

Opcion A: manual desde UI GitHub
1. Actions -> `Deploy GCP` -> `Run workflow`.

Opcion B: por CLI:
```bash
gh workflow run "Deploy GCP" --repo "${GITHUB_REPOSITORY}"
gh run list --workflow "Deploy GCP" --repo "${GITHUB_REPOSITORY}" --limit 5
```

## 10) Validacion post-deploy
Ver recursos:
```bash
kubectl -n "${GKE_NAMESPACE}" get pods
kubectl -n "${GKE_NAMESPACE}" get svc
kubectl -n "${GKE_NAMESPACE}" get ingress
kubectl -n "${GKE_NAMESPACE}" rollout status deployment/whatsapp-api --timeout=300s
kubectl -n "${GKE_NAMESPACE}" rollout status deployment/whatsapp-web --timeout=300s
```

Smoke tests:
```bash
curl -I "https://${DOMAIN}/login"
curl -s "https://${DOMAIN}/api/v1/health"
```

Validar:
1. Login UI.
2. Dashboard.
3. Conversaciones y envio de texto/media.
4. Backup desde modulo de backups.

## 11) Rollback rapido
Listar revisiones:
```bash
kubectl -n "${GKE_NAMESPACE}" rollout history deployment/whatsapp-api
kubectl -n "${GKE_NAMESPACE}" rollout history deployment/whatsapp-web
```

Revertir:
```bash
kubectl -n "${GKE_NAMESPACE}" rollout undo deployment/whatsapp-api
kubectl -n "${GKE_NAMESPACE}" rollout undo deployment/whatsapp-web
kubectl -n "${GKE_NAMESPACE}" rollout status deployment/whatsapp-api --timeout=300s
kubectl -n "${GKE_NAMESPACE}" rollout status deployment/whatsapp-web --timeout=300s
```

## 12) Comandos de soporte operativo
Logs:
```bash
kubectl -n "${GKE_NAMESPACE}" logs deploy/whatsapp-api --tail=200
kubectl -n "${GKE_NAMESPACE}" logs deploy/whatsapp-web --tail=200
```

Escalado manual temporal:
```bash
kubectl -n "${GKE_NAMESPACE}" scale deploy/whatsapp-web --replicas=4
```

Nota de arquitectura actual:
1. Mantener `whatsapp-api` en 1 replica hasta completar persistencia real y eliminar estado en memoria.
