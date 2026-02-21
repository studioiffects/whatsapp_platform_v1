# Terraform GCP Bootstrap

## 1. Preparacion
```bash
cd infra/gcp/terraform
cp terraform.tfvars.example terraform.tfvars
```

Editar `terraform.tfvars` con tus valores reales.

## 2. Inicializar y aplicar
```bash
terraform init
terraform plan -out=tfplan
terraform apply tfplan
```

## 3. Obtener outputs para CI/CD y manifests
```bash
terraform output
terraform output -raw workload_identity_provider_name
terraform output -raw gha_deployer_gsa_email
terraform output -raw api_image_repository
terraform output -raw web_image_repository
terraform output -raw cloud_sql_connection_name
terraform output -raw ingress_static_ip_name
```

## 4. Integracion con manifiestos Kubernetes
Usar los outputs para reemplazar placeholders en:
1. `infra/gcp/k8s/serviceaccounts.yaml`
2. `infra/gcp/k8s/api-deployment.yaml`
3. `infra/gcp/k8s/web-deployment.yaml`
4. `infra/gcp/k8s/ingress.yaml`

El workflow `.github/workflows/deploy-gcp.yml` ya hace este reemplazo automaticamente.
