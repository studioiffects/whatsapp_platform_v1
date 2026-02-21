---
name: manual-despliegue-aws
description: Manual tecnico detallado y paso a paso para desplegar whatsapp_platform_v1 en AWS usando ECS Fargate, ALB, RDS PostgreSQL, EFS, S3, Secrets Manager y CI/CD con GitHub Actions.
---

# Manual Despliegue AWS

## 1. Objetivo
Este manual define un procedimiento completo para desplegar `whatsapp_platform_v1` en AWS con un enfoque productivo, seguro y operable.

Aplica al monorepo actual:
1. API NestJS: `apps/api`
2. Web Next.js: `apps/web`
3. Datos: `packages/db/prisma`
4. CI: `.github/workflows/ci.yml`

## 2. Arquitectura objetivo
Topologia recomendada:
1. `Route53` para DNS.
2. `ACM` para certificados TLS.
3. `Application Load Balancer` publico.
4. `ECS Fargate` en subredes privadas:
   - Servicio `web` (puerto 3000)
   - Servicio `api` (puerto 3001)
5. `RDS PostgreSQL` en subredes privadas.
6. `EFS` montado en API para `storage/` local persistente.
7. `S3` para backups exportados y artefactos.
8. `Secrets Manager` para secretos.
9. `CloudWatch` para logs, metricas y alarmas.

Flujo:
1. Cliente -> ALB HTTPS 443
2. ALB ruta `/api/*` -> target group API (3001)
3. ALB ruta `/*` -> target group Web (3000)
4. API -> RDS/EFS/S3/servicios externos (WhatsApp API, IA providers)

## 3. Limitaciones actuales del codigo que impactan produccion
1. La persistencia de negocio actual de API es `InMemoryStore`.
2. El archivado de conversaciones si escribe a disco local (`storage/conversations/...`) y por eso se monta EFS.
3. Mientras no se conecte API a Prisma runtime real, usar `desiredCount=1` en API para evitar estado dividido en memoria.
4. El schema Prisma y migraciones ya existen y se pueden preparar en RDS para la fase de persistencia completa.

## 4. Prerrequisitos
1. Cuenta AWS activa.
2. Dominio administrado (ideal en Route53).
3. AWS CLI v2 instalado.
4. Docker instalado localmente.
5. Git y Node.js 20.
6. Permisos IAM para crear VPC, ECS, ECR, RDS, EFS, ALB, IAM, Secrets, S3.

Comandos iniciales:
```bash
aws --version
docker --version
git --version
node --version
```

## 5. Parametros base del despliegue
Definir variables de trabajo:
```bash
export AWS_REGION=us-east-1
export AWS_ACCOUNT_ID=123456789012
export PROJECT=whatsapp-platform
export ENV=prod
export DOMAIN=app.tu-dominio.com
export API_PATH=/api/*
```

Naming recomendado:
1. VPC: `whatsapp-platform-prod-vpc`
2. ECS cluster: `whatsapp-platform-prod-cluster`
3. ECR API: `whatsapp-platform-prod-api`
4. ECR Web: `whatsapp-platform-prod-web`
5. RDS: `whatsapp-platform-prod-pg`
6. EFS: `whatsapp-platform-prod-efs`
7. S3 backups: `whatsapp-platform-prod-backups`

## 6. Preparacion del repositorio para contenedores
Si aun no existen Dockerfiles, crear:

`apps/api/Dockerfile`
```Dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY package*.json ./
EXPOSE 3001
CMD ["node", "dist/main.js"]
```

`apps/web/Dockerfile`
```Dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app ./
EXPOSE 3000
CMD ["npm", "run", "start"]
```

`apps/api/.dockerignore` y `apps/web/.dockerignore`:
```gitignore
node_modules
npm-debug.log
.env
.env.local
dist
.next
playwright-report
test-results
```

## 7. Crear red y seguridad (VPC)
Configuracion recomendada:
1. VPC CIDR: `10.40.0.0/16`
2. 2 subredes publicas (ALB, NAT)
3. 2 subredes privadas app (ECS)
4. 2 subredes privadas datos (RDS)
5. NAT Gateway para salida de contenedores privados

Security Groups:
1. `sg-alb`
   - Inbound: 443 desde `0.0.0.0/0`
   - Outbound: all
2. `sg-web`
   - Inbound: 3000 desde `sg-alb`
   - Outbound: all
3. `sg-api`
   - Inbound: 3001 desde `sg-alb`
   - Outbound: all
4. `sg-rds`
   - Inbound: 5432 desde `sg-api`
5. `sg-efs`
   - Inbound: 2049 desde `sg-api`

## 8. Provisionar RDS PostgreSQL
Parametros recomendados:
1. Engine: PostgreSQL 16
2. Size inicial: `db.t4g.medium` (ajustar por carga)
3. Storage: gp3 100GB inicio
4. Multi-AZ: habilitado en produccion
5. Backups automaticos: 7-30 dias
6. Encryption KMS: habilitada
7. Public access: deshabilitado

Crear secreto DB en Secrets Manager:
1. `prod/whatsapp-platform/rds`
2. Guardar `username`, `password`, `host`, `port`, `dbname`

Construir `DATABASE_URL`:
```text
postgresql://<user>:<password>@<host>:5432/<dbname>?schema=public
```

## 9. Provisionar EFS y S3
EFS:
1. Crear file system en mismas AZ privadas.
2. Crear mount targets en subredes privadas app.
3. Asociar `sg-efs`.
4. Crear Access Point:
   - Path: `/whatsapp-platform/storage`
   - POSIX uid/gid: 1000/1000
   - Permisos: `750`

S3:
1. Crear bucket `whatsapp-platform-prod-backups`.
2. Habilitar versioning.
3. Habilitar encryption SSE-S3 o SSE-KMS.
4. Configurar lifecycle:
   - IA/Standard-IA a 30 dias
   - Glacier a 90 dias
   - Expirar segun politica interna

## 10. Crear repositorios ECR
```bash
aws ecr create-repository --repository-name ${PROJECT}-${ENV}-api --region ${AWS_REGION}
aws ecr create-repository --repository-name ${PROJECT}-${ENV}-web --region ${AWS_REGION}
```

Login ECR:
```bash
aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com
```

Build + push API:
```bash
cd apps/api
docker build -t ${PROJECT}-${ENV}-api:latest .
docker tag ${PROJECT}-${ENV}-api:latest ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${PROJECT}-${ENV}-api:latest
docker push ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${PROJECT}-${ENV}-api:latest
```

Build + push Web:
```bash
cd ../web
docker build -t ${PROJECT}-${ENV}-web:latest .
docker tag ${PROJECT}-${ENV}-web:latest ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${PROJECT}-${ENV}-web:latest
docker push ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${PROJECT}-${ENV}-web:latest
```

## 11. Configurar secretos y parametros de runtime
Crear secretos en `Secrets Manager`:
1. `prod/whatsapp-platform/api`
   - `JWT_SECRET`
   - `JWT_EXPIRES_IN=900s`
   - `JWT_REFRESH_EXPIRES_IN=7d`
   - `DEFAULT_PASSWORD` (solo bootstrap inicial, luego rotar)
   - `DATABASE_URL` (para fase con Prisma runtime)
2. `prod/whatsapp-platform/web`
   - `NEXTAUTH_SECRET`
   - `NEXTAUTH_URL=https://app.tu-dominio.com`
   - `API_BASE_URL=https://app.tu-dominio.com/api/v1`
   - `NEXT_PUBLIC_API_BASE_URL=https://app.tu-dominio.com/api/v1`

## 12. Crear ECS cluster y roles IAM
1. Crear cluster `ECS Fargate`.
2. Crear `Task Execution Role` con:
   - `AmazonECSTaskExecutionRolePolicy`
   - permiso lectura `secretsmanager:GetSecretValue`
   - permiso escritura logs CloudWatch
3. Crear `Task Role` para API con:
   - acceso minimo a S3 backups
   - acceso EFS via mount en task
   - acceso servicios externos si aplica

## 13. Definir Task Definitions
API task definition recomendada:
1. CPU: `512`
2. Memoria: `1024` o `2048`
3. Puerto contenedor: `3001`
4. Health check command:
   - `CMD-SHELL, wget -qO- http://localhost:3001/api/v1/health || exit 1`
5. Mount EFS:
   - Volume name: `storage`
   - Container path: `/app/storage`
6. Log driver:
   - `/ecs/whatsapp-platform/prod/api`

Web task definition recomendada:
1. CPU: `512`
2. Memoria: `1024`
3. Puerto contenedor: `3000`
4. Health check command:
   - `CMD-SHELL, wget -qO- http://localhost:3000/login || exit 1`
5. Log group:
   - `/ecs/whatsapp-platform/prod/web`

## 14. Crear ALB, listeners y target groups
1. Crear ALB publico en 2 subredes publicas con `sg-alb`.
2. Crear target group `tg-api`:
   - tipo IP, puerto 3001, health `/api/v1/health`
3. Crear target group `tg-web`:
   - tipo IP, puerto 3000, health `/login`
4. Listener HTTPS 443 con certificado ACM.
5. Reglas:
   - Prioridad 10: path `/api/*` -> `tg-api`
   - Default: `tg-web`

DNS:
1. En Route53 crear registro `A` alias hacia el ALB.

## 15. Crear servicios ECS
Servicio API:
1. Launch type Fargate.
2. Subredes privadas app.
3. Security group `sg-api`.
4. Desired tasks: `1` (por limitacion de estado en memoria actual).
5. Target group `tg-api`.
6. Deployment circuit breaker habilitado.

Servicio Web:
1. Launch type Fargate.
2. Subredes privadas app.
3. Security group `sg-web`.
4. Desired tasks: `2` recomendado.
5. Target group `tg-web`.

## 16. Inicializar base de datos (migraciones)
Ruta A (sin Prisma runtime aun, solo SQL):
1. Conectarse a RDS desde host permitido.
2. Ejecutar:
```bash
psql "$DATABASE_URL" -f packages/db/prisma/migrations/20260219_init/migration.sql
psql "$DATABASE_URL" -f packages/db/prisma/seeds/001_initial_seed.sql
```

Ruta B (cuando agregues `prisma` CLI al runtime de migracion):
```bash
npx prisma migrate deploy --schema packages/db/prisma/schema.prisma
```

## 17. CI/CD recomendado con GitHub Actions
Mantener workflow actual de CI y agregar workflow de deploy:
1. Trigger por tag `v*` o `workflow_dispatch`.
2. Usar OIDC GitHub -> IAM Role AWS (sin access keys estaticas).
3. Etapas:
   - `npm ci` + tests (ya existe)
   - docker build API/Web
   - push ECR con tag de commit
   - registrar nueva revision task definition
   - `aws ecs update-service --force-new-deployment`
   - smoke tests post deploy

Secrets en GitHub:
1. `AWS_REGION`
2. `AWS_ROLE_TO_ASSUME`
3. `ECR_REPO_API`
4. `ECR_REPO_WEB`
5. `ECS_CLUSTER`
6. `ECS_SERVICE_API`
7. `ECS_SERVICE_WEB`

## 18. Verificacion post despliegue
Checks obligatorios:
1. `https://app.tu-dominio.com/login` responde 200.
2. `https://app.tu-dominio.com/api/v1/health` responde `ok`.
3. Login de admin tecnico funciona con 2FA.
4. Dashboard carga agentes.
5. Envio de mensaje texto y media.
6. Generacion de backup desde UI/API.
7. Logs visibles en CloudWatch.

Comando util:
```bash
aws ecs describe-services --cluster ${PROJECT}-${ENV}-cluster --services ${PROJECT}-${ENV}-api ${PROJECT}-${ENV}-web --region ${AWS_REGION}
```

## 19. Estrategia de rollback
Rollback aplicacion:
1. Identificar revision previa de task definition estable.
2. Actualizar servicio a esa revision.
3. Forzar redeploy y validar health.

Comando:
```bash
aws ecs update-service \
  --cluster ${PROJECT}-${ENV}-cluster \
  --service ${PROJECT}-${ENV}-api \
  --task-definition whatsapp-platform-prod-api:<REV_PREVIA> \
  --force-new-deployment \
  --region ${AWS_REGION}
```

Rollback base de datos:
1. Preferir restaurar snapshot RDS a instancia nueva.
2. Reenrutar aplicacion despues de validacion.
3. Evitar rollback destructivo en la misma instancia.

## 20. Observabilidad y operacion
CloudWatch recomendado:
1. Alarmas CPU/Memory ECS > 80%.
2. Alarmas 5xx ALB.
3. Alarmas `UnHealthyHostCount > 0`.
4. Alarmas de almacenamiento RDS y conexiones.

Escalado:
1. Web autoscaling por CPU y request count.
2. API mantener 1 task hasta remover estado en memoria.

Backups:
1. RDS automated backups + snapshots manuales previas a cambios mayores.
2. EFS con AWS Backup diario.
3. S3 con lifecycle y versioning.

## 21. Checklist de hardening para produccion
1. TLS 1.2+ obligatorio, certificado ACM valido.
2. Secretos solo en Secrets Manager.
3. Rotacion periodica de `JWT_SECRET`, `NEXTAUTH_SECRET`, credenciales DB.
4. SG sin puertos abiertos innecesarios.
5. RDS sin acceso publico.
6. Logs centralizados en CloudWatch con retencion definida.
7. WAF sobre ALB si hay exposicion publica de alto trafico.
8. IAM least privilege para tasks y pipelines.

## 22. Procedimiento de despliegue resumido (orden exacto)
1. Preparar VPC/subredes/NAT/SG.
2. Crear RDS + EFS + S3 + Secrets.
3. Crear ECR + push de imagenes.
4. Crear ECS cluster + task definitions.
5. Crear ALB + target groups + listener + DNS.
6. Crear servicios ECS API/Web.
7. Ejecutar migraciones SQL iniciales.
8. Ejecutar smoke tests.
9. Activar alarmas y autoscaling.
10. Documentar release y guardar evidencia operativa.

## 23. Anexo CLI: registrar task definitions y servicios
Ejemplo `task-api.json`:
```json
{
  "family": "whatsapp-platform-prod-api",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::123456789012:role/whatsapp-platform-prod-ecs-execution-role",
  "taskRoleArn": "arn:aws:iam::123456789012:role/whatsapp-platform-prod-api-task-role",
  "containerDefinitions": [
    {
      "name": "api",
      "image": "123456789012.dkr.ecr.us-east-1.amazonaws.com/whatsapp-platform-prod-api:latest",
      "essential": true,
      "portMappings": [{ "containerPort": 3001, "protocol": "tcp" }],
      "environment": [{ "name": "PORT", "value": "3001" }],
      "secrets": [
        {
          "name": "JWT_SECRET",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789012:secret:prod/whatsapp-platform/api:JWT_SECRET::"
        },
        {
          "name": "JWT_EXPIRES_IN",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789012:secret:prod/whatsapp-platform/api:JWT_EXPIRES_IN::"
        },
        {
          "name": "JWT_REFRESH_EXPIRES_IN",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789012:secret:prod/whatsapp-platform/api:JWT_REFRESH_EXPIRES_IN::"
        },
        {
          "name": "DEFAULT_PASSWORD",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789012:secret:prod/whatsapp-platform/api:DEFAULT_PASSWORD::"
        }
      ],
      "mountPoints": [
        { "sourceVolume": "storage", "containerPath": "/app/storage", "readOnly": false }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/whatsapp-platform/prod/api",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "wget -qO- http://localhost:3001/api/v1/health || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 30
      }
    }
  ],
  "volumes": [
    {
      "name": "storage",
      "efsVolumeConfiguration": {
        "fileSystemId": "fs-xxxxxxxx",
        "transitEncryption": "ENABLED",
        "authorizationConfig": {
          "accessPointId": "fsap-xxxxxxxx",
          "iam": "ENABLED"
        }
      }
    }
  ]
}
```

Ejemplo `task-web.json`:
```json
{
  "family": "whatsapp-platform-prod-web",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::123456789012:role/whatsapp-platform-prod-ecs-execution-role",
  "taskRoleArn": "arn:aws:iam::123456789012:role/whatsapp-platform-prod-web-task-role",
  "containerDefinitions": [
    {
      "name": "web",
      "image": "123456789012.dkr.ecr.us-east-1.amazonaws.com/whatsapp-platform-prod-web:latest",
      "essential": true,
      "portMappings": [{ "containerPort": 3000, "protocol": "tcp" }],
      "secrets": [
        {
          "name": "NEXTAUTH_SECRET",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789012:secret:prod/whatsapp-platform/web:NEXTAUTH_SECRET::"
        },
        {
          "name": "NEXTAUTH_URL",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789012:secret:prod/whatsapp-platform/web:NEXTAUTH_URL::"
        },
        {
          "name": "API_BASE_URL",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789012:secret:prod/whatsapp-platform/web:API_BASE_URL::"
        },
        {
          "name": "NEXT_PUBLIC_API_BASE_URL",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789012:secret:prod/whatsapp-platform/web:NEXT_PUBLIC_API_BASE_URL::"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/whatsapp-platform/prod/web",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "wget -qO- http://localhost:3000/login || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 30
      }
    }
  ]
}
```

Registrar task definitions:
```bash
aws ecs register-task-definition --cli-input-json file://task-api.json --region ${AWS_REGION}
aws ecs register-task-definition --cli-input-json file://task-web.json --region ${AWS_REGION}
```

Crear servicios ECS:
```bash
aws ecs create-service \
  --cluster ${PROJECT}-${ENV}-cluster \
  --service-name ${PROJECT}-${ENV}-api \
  --task-definition ${PROJECT}-${ENV}-api \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-aaa,subnet-bbb],securityGroups=[sg-api],assignPublicIp=DISABLED}" \
  --load-balancers "targetGroupArn=arn:aws:elasticloadbalancing:${AWS_REGION}:${AWS_ACCOUNT_ID}:targetgroup/tg-api/xxxxxxxx,containerName=api,containerPort=3001" \
  --region ${AWS_REGION}

aws ecs create-service \
  --cluster ${PROJECT}-${ENV}-cluster \
  --service-name ${PROJECT}-${ENV}-web \
  --task-definition ${PROJECT}-${ENV}-web \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-aaa,subnet-bbb],securityGroups=[sg-web],assignPublicIp=DISABLED}" \
  --load-balancers "targetGroupArn=arn:aws:elasticloadbalancing:${AWS_REGION}:${AWS_ACCOUNT_ID}:targetgroup/tg-web/xxxxxxxx,containerName=web,containerPort=3000" \
  --region ${AWS_REGION}
```

## 24. Anexo OIDC GitHub Actions -> AWS IAM Role
Crear trust policy `github-oidc-trust.json`:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::123456789012:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:studioiffects/whatsapp_platform_v1:*"
        }
      }
    }
  ]
}
```

Crear role y policy minima:
```bash
aws iam create-role \
  --role-name whatsapp-platform-prod-gha-deploy-role \
  --assume-role-policy-document file://github-oidc-trust.json
```

Adjuntar permisos minimos:
1. `ecr:GetAuthorizationToken`, `ecr:BatchGetImage`, `ecr:PutImage`, `ecr:UploadLayerPart`
2. `ecs:RegisterTaskDefinition`, `ecs:DescribeServices`, `ecs:UpdateService`
3. `iam:PassRole` sobre roles de ECS task/execution
4. `logs:CreateLogGroup`, `logs:CreateLogStream`, `logs:PutLogEvents` si aplica

## 25. Anexo workflow deploy sugerido
Archivo sugerido: `.github/workflows/deploy-aws.yml`

```yaml
name: Deploy AWS

on:
  workflow_dispatch:
  push:
    tags:
      - "v*"

permissions:
  id-token: write
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_TO_ASSUME }}
          aws-region: ${{ secrets.AWS_REGION }}

      - uses: aws-actions/amazon-ecr-login@v2

      - name: Build and push API
        working-directory: apps/api
        run: |
          docker build -t ${{ secrets.ECR_REPO_API }}:${{ github.sha }} .
          docker push ${{ secrets.ECR_REPO_API }}:${{ github.sha }}

      - name: Build and push Web
        working-directory: apps/web
        run: |
          docker build -t ${{ secrets.ECR_REPO_WEB }}:${{ github.sha }} .
          docker push ${{ secrets.ECR_REPO_WEB }}:${{ github.sha }}

      - name: Force new deployment
        run: |
          aws ecs update-service --cluster ${{ secrets.ECS_CLUSTER }} --service ${{ secrets.ECS_SERVICE_API }} --force-new-deployment
          aws ecs update-service --cluster ${{ secrets.ECS_CLUSTER }} --service ${{ secrets.ECS_SERVICE_WEB }} --force-new-deployment
```
