---
name: manual-despliegue-gcp
description: Manual tecnico detallado, paso a paso, para desplegar whatsapp_platform_v1 en Google Cloud Platform con GKE, Cloud SQL, Artifact Registry, Secret Manager, Cloud Storage, Ingress HTTPS y CI/CD.
---

# Manual Despliegue GCP

## 1. Objetivo
Este manual define el despliegue completo de `whatsapp_platform_v1` en GCP con una arquitectura productiva, segura y operable.

Componentes del monorepo:
1. API NestJS: `apps/api`
2. Web Next.js: `apps/web`
3. Prisma y migraciones: `packages/db/prisma`
4. CI actual: `.github/workflows/ci.yml`

## 2. Arquitectura recomendada en GCP
Arquitectura objetivo:
1. GKE Standard regional para ejecutar `api` y `web`.
2. Ingress GKE + External Application Load Balancer para exponer HTTPS.
3. Certificado gestionado por Google (`ManagedCertificate`).
4. Cloud SQL PostgreSQL (private IP).
5. Filestore CSI (ReadWriteMany) para persistencia de `storage/` del API.
6. Cloud Storage para backups exportados y artefactos.
7. Secret Manager para secretos.
8. Artifact Registry para imagenes Docker.
9. Cloud Monitoring + Cloud Logging + alertas.
10. Backup for GKE para respaldo de manifiestos y volumenes.

Flujo:
1. Cliente -> HTTPS Load Balancer -> Ingress GKE
2. Ingress enruta `/api` al servicio API y `/` al servicio Web
3. API consume Cloud SQL (via Cloud SQL Auth Proxy sidecar) y persiste archivos en PVC RWX

## 3. Limitaciones actuales del codigo y decisiones operativas
1. El estado de negocio de API esta en `InMemoryStore`.
2. El archivo de conversaciones si se guarda en disco local (`/app/storage`).
3. Mientras no se complete persistencia real en API, usar `replicas: 1` en API para evitar inconsistencia de estado.
4. Web puede escalar horizontalmente (`replicas >= 2`).
5. Prisma schema/migraciones ya existen y se pueden aplicar en Cloud SQL.
6. `apps/api/src/main.ts` tiene CORS limitado a `http://localhost:3000`; antes de produccion, incluir `https://${DOMAIN}` como origen permitido.

## 4. Prerrequisitos
1. Proyecto GCP activo con facturacion.
2. Dominio disponible (Cloud DNS o proveedor externo).
3. Herramientas:
   - `gcloud` actualizado
   - `kubectl`
   - `docker`
   - `git`
   - `node` 20
4. Permisos IAM para red, GKE, SQL, DNS, IAM, Artifact Registry, Secret Manager.

Verificacion local:
```bash
gcloud version
kubectl version --client
docker --version
node --version
```

## 5. Variables base de trabajo
```bash
export PROJECT_ID="tu-project-id"
export PROJECT_NUM="$(gcloud projects describe ${PROJECT_ID} --format='value(projectNumber)')"
export REGION="us-central1"
export ZONE="us-central1-a"
export ENV="prod"
export DOMAIN="app.tu-dominio.com"

export VPC_NAME="wa-${ENV}-vpc"
export SUBNET_GKE="wa-${ENV}-subnet-gke"
export SUBNET_PROXY="wa-${ENV}-subnet-proxy"
export ROUTER_NAME="wa-${ENV}-router"
export NAT_NAME="wa-${ENV}-nat"

export GKE_CLUSTER="wa-${ENV}-gke"
export K8S_NAMESPACE="whatsapp-${ENV}"

export AR_REPO="wa-${ENV}-repo"
export IMAGE_API="${REGION}-docker.pkg.dev/${PROJECT_ID}/${AR_REPO}/api"
export IMAGE_WEB="${REGION}-docker.pkg.dev/${PROJECT_ID}/${AR_REPO}/web"

export SQL_INSTANCE="wa-${ENV}-pg"
export SQL_DB="whatsapp_platform"
export SQL_USER="wa_app_user"

export GSA_API="wa-api-runtime@${PROJECT_ID}.iam.gserviceaccount.com"
export GSA_WEB="wa-web-runtime@${PROJECT_ID}.iam.gserviceaccount.com"
```

## 6. Habilitar APIs de GCP
```bash
gcloud services enable \
  container.googleapis.com \
  compute.googleapis.com \
  sqladmin.googleapis.com \
  servicenetworking.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  dns.googleapis.com \
  monitoring.googleapis.com \
  logging.googleapis.com \
  gkebackup.googleapis.com \
  --project ${PROJECT_ID}
```

## 7. Crear red base (VPC, subredes, NAT)
### 7.1 VPC y subredes
```bash
gcloud compute networks create ${VPC_NAME} \
  --subnet-mode=custom \
  --project ${PROJECT_ID}

gcloud compute networks subnets create ${SUBNET_GKE} \
  --network ${VPC_NAME} \
  --range 10.40.0.0/20 \
  --region ${REGION} \
  --project ${PROJECT_ID}

gcloud compute networks subnets create ${SUBNET_PROXY} \
  --network ${VPC_NAME} \
  --range 10.40.16.0/24 \
  --region ${REGION} \
  --purpose=REGIONAL_MANAGED_PROXY \
  --role=ACTIVE \
  --project ${PROJECT_ID}
```

### 7.2 Cloud Router y Cloud NAT
```bash
gcloud compute routers create ${ROUTER_NAME} \
  --network ${VPC_NAME} \
  --region ${REGION} \
  --project ${PROJECT_ID}

gcloud compute routers nats create ${NAT_NAME} \
  --router=${ROUTER_NAME} \
  --region=${REGION} \
  --nat-all-subnet-ip-ranges \
  --auto-allocate-nat-external-ips \
  --project ${PROJECT_ID}
```

## 8. Private Service Access para Cloud SQL (private IP)
Reservar rango para servicios gestionados:
```bash
gcloud compute addresses create wa-${ENV}-sql-psa-range \
  --global \
  --purpose=VPC_PEERING \
  --prefix-length=16 \
  --network=${VPC_NAME} \
  --project ${PROJECT_ID}

gcloud services vpc-peerings connect \
  --service=servicenetworking.googleapis.com \
  --ranges=wa-${ENV}-sql-psa-range \
  --network=${VPC_NAME} \
  --project ${PROJECT_ID}
```

## 9. Crear Cloud SQL PostgreSQL
### 9.1 Instancia
```bash
gcloud sql instances create ${SQL_INSTANCE} \
  --database-version=POSTGRES_16 \
  --region=${REGION} \
  --cpu=2 \
  --memory=8GiB \
  --storage-size=100GB \
  --storage-type=SSD \
  --availability-type=REGIONAL \
  --network=projects/${PROJECT_ID}/global/networks/${VPC_NAME} \
  --no-assign-ip \
  --backup-start-time=03:00 \
  --enable-point-in-time-recovery \
  --project ${PROJECT_ID}
```

### 9.2 Base de datos y usuario
```bash
gcloud sql databases create ${SQL_DB} \
  --instance=${SQL_INSTANCE} \
  --project ${PROJECT_ID}

export SQL_PASSWORD="$(openssl rand -base64 32)"

gcloud sql users create ${SQL_USER} \
  --instance=${SQL_INSTANCE} \
  --password="${SQL_PASSWORD}" \
  --project ${PROJECT_ID}
```

## 10. Crear secretos en Secret Manager
Crear secretos:
```bash
printf "%s" "$(openssl rand -hex 32)" | gcloud secrets create wa-${ENV}-jwt-secret --data-file=- --project ${PROJECT_ID}
printf "%s" "$(openssl rand -hex 32)" | gcloud secrets create wa-${ENV}-nextauth-secret --data-file=- --project ${PROJECT_ID}
printf "%s" "${SQL_PASSWORD}" | gcloud secrets create wa-${ENV}-sql-password --data-file=- --project ${PROJECT_ID}
printf "%s" "${DOMAIN}" | gcloud secrets create wa-${ENV}-domain --data-file=- --project ${PROJECT_ID}
```

Agregar versiones futuras:
```bash
printf "%s" "nuevo_valor" | gcloud secrets versions add wa-${ENV}-jwt-secret --data-file=- --project ${PROJECT_ID}
```

## 11. Crear Artifact Registry
```bash
gcloud artifacts repositories create ${AR_REPO} \
  --repository-format=docker \
  --location=${REGION} \
  --description="Docker repo para whatsapp platform ${ENV}" \
  --project ${PROJECT_ID}

gcloud auth configure-docker ${REGION}-docker.pkg.dev
```

### 11.1 Bucket para backups y archivos exportables
```bash
export BACKUP_BUCKET="wa-${ENV}-backups-${PROJECT_ID}"
gcloud storage buckets create gs://${BACKUP_BUCKET} \
  --location=${REGION} \
  --uniform-bucket-level-access \
  --public-access-prevention \
  --project ${PROJECT_ID}

gcloud storage buckets update gs://${BACKUP_BUCKET} --versioning
```

Lifecycle sugerido (`lifecycle.json`):
```json
{
  "rule": [
    {
      "action": { "type": "SetStorageClass", "storageClass": "NEARLINE" },
      "condition": { "age": 30 }
    },
    {
      "action": { "type": "SetStorageClass", "storageClass": "ARCHIVE" },
      "condition": { "age": 90 }
    }
  ]
}
```

Aplicar lifecycle:
```bash
gcloud storage buckets update gs://${BACKUP_BUCKET} --lifecycle-file=lifecycle.json
```

## 12. Crear cluster GKE Standard
```bash
gcloud container clusters create ${GKE_CLUSTER} \
  --region=${REGION} \
  --network=${VPC_NAME} \
  --subnetwork=${SUBNET_GKE} \
  --release-channel=regular \
  --machine-type=e2-standard-4 \
  --num-nodes=3 \
  --enable-ip-alias \
  --workload-pool=${PROJECT_ID}.svc.id.goog \
  --addons=HttpLoadBalancing,HorizontalPodAutoscaling,GcpFilestoreCsiDriver,BackupRestore \
  --enable-shielded-nodes \
  --enable-autorepair \
  --enable-autoupgrade \
  --project ${PROJECT_ID}
```

Obtener credenciales:
```bash
gcloud container clusters get-credentials ${GKE_CLUSTER} \
  --region=${REGION} \
  --project ${PROJECT_ID}
```

Namespace:
```bash
kubectl create namespace ${K8S_NAMESPACE}
```

## 13. Workload Identity para pods API/Web
### 13.1 Crear service accounts GCP
```bash
gcloud iam service-accounts create wa-api-runtime \
  --display-name="WA API Runtime" \
  --project ${PROJECT_ID}

gcloud iam service-accounts create wa-web-runtime \
  --display-name="WA WEB Runtime" \
  --project ${PROJECT_ID}
```

### 13.2 Asignar IAM minimo
API runtime:
```bash
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:${GSA_API}" \
  --role="roles/cloudsql.client"

gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:${GSA_API}" \
  --role="roles/secretmanager.secretAccessor"

gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:${GSA_API}" \
  --role="roles/storage.objectAdmin"
```

Web runtime:
```bash
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:${GSA_WEB}" \
  --role="roles/secretmanager.secretAccessor"
```

### 13.3 Crear KSA y enlazar a GSA
```bash
kubectl create serviceaccount api-ksa -n ${K8S_NAMESPACE}
kubectl create serviceaccount web-ksa -n ${K8S_NAMESPACE}

kubectl annotate serviceaccount api-ksa \
  -n ${K8S_NAMESPACE} \
  iam.gke.io/gcp-service-account=${GSA_API}

kubectl annotate serviceaccount web-ksa \
  -n ${K8S_NAMESPACE} \
  iam.gke.io/gcp-service-account=${GSA_WEB}
```

Permitir impersonacion Workload Identity:
```bash
gcloud iam service-accounts add-iam-policy-binding ${GSA_API} \
  --role="roles/iam.workloadIdentityUser" \
  --member="serviceAccount:${PROJECT_ID}.svc.id.goog[${K8S_NAMESPACE}/api-ksa]" \
  --project ${PROJECT_ID}

gcloud iam service-accounts add-iam-policy-binding ${GSA_WEB} \
  --role="roles/iam.workloadIdentityUser" \
  --member="serviceAccount:${PROJECT_ID}.svc.id.goog[${K8S_NAMESPACE}/web-ksa]" \
  --project ${PROJECT_ID}
```

## 14. Preparar imagenes Docker (si aun no existen Dockerfile)
Si no existen Dockerfiles, usar los mismos del manual AWS en:
1. `apps/api/Dockerfile`
2. `apps/web/Dockerfile`
3. `apps/api/.dockerignore`
4. `apps/web/.dockerignore`

## 15. Build y push de imagenes
```bash
export GIT_SHA="$(git rev-parse --short HEAD)"

cd apps/api
docker build -t ${IMAGE_API}:${GIT_SHA} -t ${IMAGE_API}:latest .
docker push ${IMAGE_API}:${GIT_SHA}
docker push ${IMAGE_API}:latest

cd ../web
docker build -t ${IMAGE_WEB}:${GIT_SHA} -t ${IMAGE_WEB}:latest .
docker push ${IMAGE_WEB}:${GIT_SHA}
docker push ${IMAGE_WEB}:latest
```

## 16. Crear secretos Kubernetes desde Secret Manager
```bash
export JWT_SECRET="$(gcloud secrets versions access latest --secret=wa-${ENV}-jwt-secret --project ${PROJECT_ID})"
export NEXTAUTH_SECRET="$(gcloud secrets versions access latest --secret=wa-${ENV}-nextauth-secret --project ${PROJECT_ID})"
export SQL_PASSWORD_VALUE="$(gcloud secrets versions access latest --secret=wa-${ENV}-sql-password --project ${PROJECT_ID})"
```

API secrets:
```bash
kubectl -n ${K8S_NAMESPACE} create secret generic api-secret \
  --from-literal=PORT=3001 \
  --from-literal=JWT_SECRET="${JWT_SECRET}" \
  --from-literal=JWT_EXPIRES_IN=900s \
  --from-literal=JWT_REFRESH_EXPIRES_IN=7d \
  --from-literal=DEFAULT_PASSWORD='ChangeMe123!' \
  --from-literal=DATABASE_URL="postgresql://${SQL_USER}:${SQL_PASSWORD_VALUE}@127.0.0.1:5432/${SQL_DB}?schema=public" \
  --dry-run=client -o yaml | kubectl apply -f -
```

Web secrets:
```bash
kubectl -n ${K8S_NAMESPACE} create secret generic web-secret \
  --from-literal=NEXTAUTH_URL="https://${DOMAIN}" \
  --from-literal=NEXTAUTH_SECRET="${NEXTAUTH_SECRET}" \
  --from-literal=API_BASE_URL="https://${DOMAIN}/api/v1" \
  --from-literal=NEXT_PUBLIC_API_BASE_URL="https://${DOMAIN}/api/v1" \
  --dry-run=client -o yaml | kubectl apply -f -
```

## 17. Manifiestos Kubernetes (base productiva)
Crear carpeta local:
```bash
mkdir -p infra/gcp/k8s
```

### 17.1 `infra/gcp/k8s/storage-pvc.yaml`
```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: api-storage-pvc
  namespace: whatsapp-prod
spec:
  accessModes:
    - ReadWriteMany
  storageClassName: standard-rwx
  resources:
    requests:
      storage: 100Gi
```

### 17.2 `infra/gcp/k8s/api-deployment.yaml`
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: whatsapp-api
  namespace: whatsapp-prod
spec:
  replicas: 1
  selector:
    matchLabels:
      app: whatsapp-api
  template:
    metadata:
      labels:
        app: whatsapp-api
    spec:
      serviceAccountName: api-ksa
      containers:
        - name: api
          image: us-central1-docker.pkg.dev/PROJECT_ID/wa-prod-repo/api:latest
          ports:
            - containerPort: 3001
          envFrom:
            - secretRef:
                name: api-secret
          volumeMounts:
            - name: storage
              mountPath: /app/storage
          readinessProbe:
            httpGet:
              path: /api/v1/health
              port: 3001
            initialDelaySeconds: 20
            periodSeconds: 10
          livenessProbe:
            httpGet:
              path: /api/v1/health
              port: 3001
            initialDelaySeconds: 30
            periodSeconds: 15
        - name: cloud-sql-proxy
          image: gcr.io/cloud-sql-connectors/cloud-sql-proxy:2.20.0
          args:
            - "--private-ip"
            - "--port=5432"
            - "PROJECT_ID:REGION:wa-prod-pg"
      volumes:
        - name: storage
          persistentVolumeClaim:
            claimName: api-storage-pvc
```

### 17.3 `infra/gcp/k8s/web-deployment.yaml`
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: whatsapp-web
  namespace: whatsapp-prod
spec:
  replicas: 2
  selector:
    matchLabels:
      app: whatsapp-web
  template:
    metadata:
      labels:
        app: whatsapp-web
    spec:
      serviceAccountName: web-ksa
      containers:
        - name: web
          image: us-central1-docker.pkg.dev/PROJECT_ID/wa-prod-repo/web:latest
          ports:
            - containerPort: 3000
          envFrom:
            - secretRef:
                name: web-secret
          readinessProbe:
            httpGet:
              path: /login
              port: 3000
            initialDelaySeconds: 20
            periodSeconds: 10
          livenessProbe:
            httpGet:
              path: /login
              port: 3000
            initialDelaySeconds: 30
            periodSeconds: 15
```

### 17.4 `infra/gcp/k8s/services.yaml`
```yaml
apiVersion: v1
kind: Service
metadata:
  name: whatsapp-api-svc
  namespace: whatsapp-prod
spec:
  type: NodePort
  selector:
    app: whatsapp-api
  ports:
    - name: http
      port: 3001
      targetPort: 3001
---
apiVersion: v1
kind: Service
metadata:
  name: whatsapp-web-svc
  namespace: whatsapp-prod
spec:
  type: NodePort
  selector:
    app: whatsapp-web
  ports:
    - name: http
      port: 3000
      targetPort: 3000
```

### 17.5 `infra/gcp/k8s/ingress.yaml`
```yaml
apiVersion: networking.gke.io/v1
kind: ManagedCertificate
metadata:
  name: wa-managed-cert
  namespace: whatsapp-prod
spec:
  domains:
    - app.tu-dominio.com
---
apiVersion: networking.gke.io/v1beta1
kind: FrontendConfig
metadata:
  name: wa-frontend-config
  namespace: whatsapp-prod
spec:
  redirectToHttps:
    enabled: true
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: wa-ingress
  namespace: whatsapp-prod
  annotations:
    kubernetes.io/ingress.class: "gce"
    kubernetes.io/ingress.global-static-ip-name: "wa-prod-ip"
    networking.gke.io/managed-certificates: "wa-managed-cert"
    networking.gke.io/v1beta1.FrontendConfig: "wa-frontend-config"
spec:
  rules:
    - host: app.tu-dominio.com
      http:
        paths:
          - path: /api
            pathType: Prefix
            backend:
              service:
                name: whatsapp-api-svc
                port:
                  number: 3001
          - path: /
            pathType: Prefix
            backend:
              service:
                name: whatsapp-web-svc
                port:
                  number: 3000
```

## 18. Reservar IP publica global y DNS
Reservar IP:
```bash
gcloud compute addresses create wa-prod-ip --global --project ${PROJECT_ID}
gcloud compute addresses describe wa-prod-ip --global --project ${PROJECT_ID} --format='value(address)'
```

Si usas Cloud DNS:
```bash
export DNS_ZONE="tu-managed-zone"
export LB_IP="$(gcloud compute addresses describe wa-prod-ip --global --project ${PROJECT_ID} --format='value(address)')"

gcloud dns record-sets transaction start --zone=${DNS_ZONE} --project ${PROJECT_ID}
gcloud dns record-sets transaction add ${LB_IP} \
  --name="${DOMAIN}." \
  --ttl=300 \
  --type=A \
  --zone=${DNS_ZONE} \
  --project ${PROJECT_ID}
gcloud dns record-sets transaction execute --zone=${DNS_ZONE} --project ${PROJECT_ID}
```

## 19. Aplicar manifests y validar rollout
```bash
kubectl apply -f infra/gcp/k8s/storage-pvc.yaml
kubectl apply -f infra/gcp/k8s/api-deployment.yaml
kubectl apply -f infra/gcp/k8s/web-deployment.yaml
kubectl apply -f infra/gcp/k8s/services.yaml
kubectl apply -f infra/gcp/k8s/ingress.yaml

kubectl -n ${K8S_NAMESPACE} rollout status deploy/whatsapp-api
kubectl -n ${K8S_NAMESPACE} rollout status deploy/whatsapp-web
kubectl -n ${K8S_NAMESPACE} get ingress wa-ingress
```

## 20. Inicializar base de datos con migraciones existentes
Opcion recomendada: ejecutar desde una VM/Bastion en la misma VPC o mediante Cloud SQL Auth Proxy local.

Iniciar proxy local:
```bash
cloud-sql-proxy --private-ip ${PROJECT_ID}:${REGION}:${SQL_INSTANCE}
```

Aplicar SQL:
```bash
export DATABASE_URL="postgresql://${SQL_USER}:${SQL_PASSWORD}@127.0.0.1:5432/${SQL_DB}?schema=public"
psql "${DATABASE_URL}" -f packages/db/prisma/migrations/20260219_init/migration.sql
psql "${DATABASE_URL}" -f packages/db/prisma/seeds/001_initial_seed.sql
```

## 21. CI/CD con GitHub Actions + Workload Identity Federation
### 21.1 Crear SA de despliegue
```bash
gcloud iam service-accounts create wa-gha-deployer \
  --display-name="GitHub Actions Deployer" \
  --project ${PROJECT_ID}
```

Asignar roles minimos iniciales:
```bash
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:wa-gha-deployer@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.writer"

gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:wa-gha-deployer@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/container.admin"
```

### 21.2 Crear Workload Identity Pool/Provider (GitHub OIDC)
```bash
gcloud iam workload-identity-pools create "github" \
  --project="${PROJECT_ID}" \
  --location="global" \
  --display-name="GitHub Actions Pool"

gcloud iam workload-identity-pools providers create-oidc "whatsapp-platform" \
  --project="${PROJECT_ID}" \
  --location="global" \
  --workload-identity-pool="github" \
  --display-name="whatsapp-platform-provider" \
  --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository,attribute.repository_owner=assertion.repository_owner" \
  --attribute-condition="assertion.repository_owner == 'studioiffects'" \
  --issuer-uri="https://token.actions.githubusercontent.com"
```

Obtener `WORKLOAD_IDENTITY_PROVIDER`:
```bash
gcloud iam workload-identity-pools providers describe "whatsapp-platform" \
  --project="${PROJECT_ID}" \
  --location="global" \
  --workload-identity-pool="github" \
  --format="value(name)"
```

Permitir que GitHub asuma la SA:
```bash
gcloud iam service-accounts add-iam-policy-binding \
  "wa-gha-deployer@${PROJECT_ID}.iam.gserviceaccount.com" \
  --project="${PROJECT_ID}" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/${PROJECT_NUM}/locations/global/workloadIdentityPools/github/attribute.repository/studioiffects/whatsapp_platform_v1"
```

### 21.3 Secrets en GitHub
Configurar en GitHub:
1. `GCP_PROJECT_ID`
2. `GCP_REGION`
3. `GKE_CLUSTER`
4. `GKE_NAMESPACE`
5. `WORKLOAD_IDENTITY_PROVIDER`
6. `GCP_SERVICE_ACCOUNT` (wa-gha-deployer)
7. `IMAGE_API`
8. `IMAGE_WEB`

### 21.4 Workflow deploy sugerido
Archivo: `.github/workflows/deploy-gcp.yml`

```yaml
name: Deploy GCP

on:
  workflow_dispatch:
  push:
    tags:
      - "v*"

permissions:
  contents: read
  id-token: write

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: google-github-actions/auth@v3
        with:
          project_id: ${{ secrets.GCP_PROJECT_ID }}
          workload_identity_provider: ${{ secrets.WORKLOAD_IDENTITY_PROVIDER }}
          service_account: ${{ secrets.GCP_SERVICE_ACCOUNT }}

      - uses: google-github-actions/setup-gcloud@v2

      - name: Configure Docker for Artifact Registry
        run: gcloud auth configure-docker ${{ secrets.GCP_REGION }}-docker.pkg.dev --quiet

      - name: Build and push API
        working-directory: apps/api
        run: |
          docker build -t ${{ secrets.IMAGE_API }}:${{ github.sha }} -t ${{ secrets.IMAGE_API }}:latest .
          docker push ${{ secrets.IMAGE_API }}:${{ github.sha }}
          docker push ${{ secrets.IMAGE_API }}:latest

      - name: Build and push WEB
        working-directory: apps/web
        run: |
          docker build -t ${{ secrets.IMAGE_WEB }}:${{ github.sha }} -t ${{ secrets.IMAGE_WEB }}:latest .
          docker push ${{ secrets.IMAGE_WEB }}:${{ github.sha }}
          docker push ${{ secrets.IMAGE_WEB }}:latest

      - name: Get GKE credentials
        run: |
          gcloud container clusters get-credentials "${{ secrets.GKE_CLUSTER }}" \
            --region "${{ secrets.GCP_REGION }}" \
            --project "${{ secrets.GCP_PROJECT_ID }}"

      - name: Apply manifests
        run: |
          kubectl apply -f infra/gcp/k8s/
          kubectl -n "${{ secrets.GKE_NAMESPACE }}" rollout status deploy/whatsapp-api
          kubectl -n "${{ secrets.GKE_NAMESPACE }}" rollout status deploy/whatsapp-web
```

## 22. Observabilidad y alertas
1. Habilitar logs de workloads en Cloud Logging.
2. Crear alertas:
   - `Kubernetes Pod CrashLooping`
   - `HTTP 5xx` del load balancer
   - `Cloud SQL CPU > 80%` y conexiones altas
   - latencia p95 en endpoints de API
3. Crear uptime check a:
   - `https://${DOMAIN}/login`
   - `https://${DOMAIN}/api/v1/health`

## 23. Backup y recuperacion
### 23.1 Cloud SQL
1. Backups automaticos y PITR habilitados en la instancia.
2. Antes de cambios mayores, snapshot manual.

### 23.2 Backup for GKE
El API de Backup for GKE ya debe estar habilitado:
```bash
gcloud services enable gkebackup.googleapis.com --project ${PROJECT_ID}
```

Crear backup plan (ejemplo):
```bash
gcloud beta container backup-restore backup-plans create wa-prod-plan \
  --location=${REGION} \
  --cluster=projects/${PROJECT_ID}/locations/${REGION}/clusters/${GKE_CLUSTER} \
  --all-namespaces \
  --include-secrets \
  --include-volume-data \
  --target-rpo-minutes=1440 \
  --backup-retain-days=7
```

## 24. Rollback operativo
Rollback de aplicacion:
1. Identificar imagen estable previa.
2. Actualizar deployment con imagen anterior.
3. Verificar rollout y smoke tests.

Comandos:
```bash
kubectl -n ${K8S_NAMESPACE} set image deploy/whatsapp-api api=${IMAGE_API}:<TAG_PREVIO>
kubectl -n ${K8S_NAMESPACE} set image deploy/whatsapp-web web=${IMAGE_WEB}:<TAG_PREVIO>
kubectl -n ${K8S_NAMESPACE} rollout status deploy/whatsapp-api
kubectl -n ${K8S_NAMESPACE} rollout status deploy/whatsapp-web
```

Rollback de datos:
1. Restaurar Cloud SQL desde backup/PITR a nueva instancia.
2. Redirigir conexion y validar.
3. Evitar rollback destructivo sobre instancia en uso.

## 25. Hardening obligatorio en produccion
1. Solo private IP para Cloud SQL.
2. Rotacion periodica de secretos (`JWT_SECRET`, `NEXTAUTH_SECRET`, credenciales DB).
3. Principio de menor privilegio en IAM.
4. No usar service account keys estaticas en CI/CD; usar OIDC.
5. HTTPS obligatorio con ManagedCertificate.
6. Definir NetworkPolicy Kubernetes para aislar trafico interno.
7. Activar escaneo de vulnerabilidades de imagenes.
8. Retencion y export de logs segun cumplimiento.

## 26. Checklist final de puesta en produccion
1. APIs habilitadas y red privada operativa.
2. Cloud SQL creado con backups y PITR.
3. Cluster GKE creado con Workload Identity y addons requeridos.
4. Imagenes API/Web publicadas en Artifact Registry.
5. Secrets en Secret Manager y Kubernetes.
6. Deploy API/Web/PVC/Ingress en estado `Ready`.
7. DNS apuntando al IP global del Ingress.
8. Certificado `ManagedCertificate` en estado `Active`.
9. Smoke tests funcionales ejecutados:
   - login
   - dashboard
   - conversaciones
   - envio texto/media
   - backup
10. Alertas y backups validados.

## 27. Opcion IaC con Terraform (generada en este repositorio)
Ruta:
1. `infra/gcp/terraform`

Pasos:
1. `cd infra/gcp/terraform`
2. `cp terraform.tfvars.example terraform.tfvars`
3. Editar `terraform.tfvars`
4. `terraform init`
5. `terraform plan -out=tfplan`
6. `terraform apply tfplan`

Outputs clave para CI/CD:
1. `terraform output -raw workload_identity_provider_name`
2. `terraform output -raw gha_deployer_gsa_email`
3. `terraform output -raw api_image_repository`
4. `terraform output -raw web_image_repository`
5. `terraform output -raw cloud_sql_connection_name`
6. `terraform output -raw ingress_static_ip_name`

## 28. Referencias oficiales GCP
1. Artifact Registry auth Docker: https://docs.cloud.google.com/artifact-registry/docs/docker/authentication
2. Workload Identity Federation for GKE: https://docs.cloud.google.com/kubernetes-engine/docs/concepts/workload-identity
3. Auth de workloads GKE a APIs GCP: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/workload-identity
4. Cloud SQL best practices (Private IP): https://cloud.google.com/sql/docs/postgres/best-practices
5. Conectar GKE a Cloud SQL (PostgreSQL): https://cloud.google.com/sql/docs/postgres/connect-kubernetes-engine
6. Cloud SQL Auth Proxy: https://cloud.google.com/sql/docs/postgres/sql-proxy
7. Filestore CSI en GKE: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/persistent-volumes/filestore-csi-driver
8. Ingress en GKE: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/load-balance-ingress
9. ManagedCertificate en Ingress: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/managed-certs
10. Backup for GKE concepto: https://docs.cloud.google.com/kubernetes-engine/docs/add-on/backup-for-gke/concepts/backup-for-gke
11. Backup plans Backup for GKE: https://docs.cloud.google.com/kubernetes-engine/docs/add-on/backup-for-gke/how-to/backup-plan
12. Cloud DNS record sets: https://docs.cloud.google.com/dns/docs/records
13. WIF para pipelines: https://cloud.google.com/iam/docs/workload-identity-federation-with-deployment-pipelines
14. GitHub Action auth GCP: https://github.com/google-github-actions/auth
