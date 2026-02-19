# Manual Tecnico de Instalacion, Despliegue y DevOps

## 1. Objetivo
Este manual define el proceso tecnico completo para instalar, validar, desplegar y operar la plataforma `whatsapp_platform_v1` en entornos `dev`, `staging` y `production`.

## 2. Alcance
Incluye:
1. Preparacion de infraestructura.
2. Instalacion de dependencias.
3. Configuracion de variables y secretos.
4. Build y pruebas automaticas.
5. Estrategia CI/CD en GitHub Actions.
6. Proceso de release, rollback y operacion.
7. Lineamientos de backup y continuidad.

## 3. Estado actual del repositorio
Componentes implementados:
1. API NestJS: `apps/api`.
2. Web Next.js: `apps/web`.
3. Modelo de datos Prisma/PostgreSQL: `packages/db/prisma`.
4. Pipeline CI: `.github/workflows/ci.yml`.
5. Pruebas E2E API (Jest/Supertest) y Web (Playwright).

Notas importantes:
1. API funcionalmente usa `InMemoryStore` para operacion inmediata.
2. El schema/migraciones Prisma ya existen para evolucion a persistencia real.

## 4. Arquitectura de despliegue recomendada
Topologia minima recomendada:
1. Reverse proxy TLS (Nginx/Traefik) para entrada HTTPS.
2. Servicio `web` (Next.js).
3. Servicio `api` (NestJS).
4. Base de datos PostgreSQL.
5. Redis (si se activa cola distribuida en siguientes fases).
6. Almacen local o montado para `storage/` (conversaciones y media).

Flujo:
1. Cliente -> Reverse Proxy -> Web/API.
2. Web consume API `/api/v1`.
3. API procesa auth, negocio y webhooks.
4. API persiste conversaciones (actualmente en memoria + JSONL local).
5. API ejecuta backups y operaciones de reporte.

## 5. Requisitos tecnicos
Versiones recomendadas:
1. Node.js 20 LTS.
2. npm 10+.
3. Git 2.40+.
4. PostgreSQL 16 (si se activa persistencia real).
5. Docker 24+ y Docker Compose v2 (opcional, recomendado para entornos estandarizados).

Puertos por defecto:
1. Web: `3000`.
2. API: `3001`.
3. PostgreSQL: `5432`.

## 6. Estructura clave de archivos
1. API config: `apps/api/.env.example`.
2. Web config: `apps/web/.env.example`.
3. Migraciones: `packages/db/prisma/migrations/`.
4. Seed inicial: `packages/db/prisma/seeds/001_initial_seed.sql`.
5. CI: `.github/workflows/ci.yml`.
6. OpenAPI: `docs/OPENAPI.yaml`.
7. Matriz RBAC: `docs/RBAC_MATRIX.md`.

## 7. Instalacion en entorno DEV (paso a paso)
### 7.1 Clonar
```bash
git clone https://github.com/studioiffects/whatsapp_platform_v1.git
cd whatsapp_platform_v1
```

### 7.2 Instalar dependencias
```bash
cd apps/api
npm install

cd ../web
npm install
```

### 7.3 Configurar variables
API:
1. Copiar `apps/api/.env.example` a `apps/api/.env`.
2. Ajustar `JWT_SECRET` y tiempos de expiracion.

Web:
1. Copiar `apps/web/.env.example` a `apps/web/.env.local`.
2. Validar:
   - `NEXTAUTH_URL=http://localhost:3000`
   - `API_BASE_URL=http://localhost:3001/api/v1`
   - `NEXT_PUBLIC_API_BASE_URL=http://localhost:3001/api/v1`

### 7.4 (Opcional) preparar DB real
```bash
npx prisma migrate deploy --schema packages/db/prisma/schema.prisma
psql "$DATABASE_URL" -f packages/db/prisma/seeds/001_initial_seed.sql
npx prisma generate --schema packages/db/prisma/schema.prisma
```

### 7.5 Levantar servicios
Terminal 1:
```bash
cd apps/api
npm run start:dev
```

Terminal 2:
```bash
cd apps/web
npm run dev
```

### 7.6 Validacion funcional
1. API health: `http://localhost:3001/api/v1/health`
2. Web login: `http://localhost:3000/login`
3. Navegar a dashboard y conversaciones.

## 8. Pruebas de calidad antes de desplegar
### 8.1 API
```bash
cd apps/api
npm run build
npm run test:e2e
```

### 8.2 Web
```bash
cd apps/web
npm run build
npx playwright install chromium
npm run test:e2e
```

## 9. Pipeline CI/CD actual (GitHub Actions)
Archivo: `.github/workflows/ci.yml`

Jobs:
1. `api-ci`
   - `npm ci`
   - `npm run build`
   - `npm run test:e2e`
2. `web-ci`
   - instala deps API y Web
   - `npm run build` web
   - instala Chromium Playwright
   - `npm run test:e2e`

Triggers:
1. `push`
2. `pull_request`

## 10. Configuracion recomendada de secrets en GitHub
Minimo recomendado:
1. `NEXTAUTH_SECRET`
2. `JWT_SECRET`
3. `DATABASE_URL` (cuando API use Prisma real)
4. Secrets de despliegue (SSH, cloud tokens, registry)

Regla:
1. Ningun secreto debe quedar en `.env.example` ni en codigo fuente.

## 11. Proceso de release (staging -> production)
### 11.1 Flujo recomendado
1. Crear branch feature.
2. Abrir PR a `main`.
3. Validar CI en verde.
4. Merge a `main`.
5. Deploy automatico o manual a `staging`.
6. Smoke tests en staging.
7. Promocion a `production`.

### 11.2 Smoke tests minimos
1. Login admin con 2FA.
2. Dashboard carga KPIs.
3. Conversaciones listan y envian texto.
4. Endpoint de backups responde.
5. Endpoint IA responde.

## 12. Estrategia de despliegue recomendada
### 12.1 Opcion A (recomendada en fase actual): VM + systemd + reverse proxy
1. Build de artefactos.
2. Despliegue en carpeta versionada.
3. Reinicio controlado de servicios `api` y `web`.
4. Health checks antes de exponer trafico.

### 12.2 Opcion B: Contenedores
1. Crear imagen `api`.
2. Crear imagen `web`.
3. Subir a registry.
4. Desplegar con Compose o Kubernetes.

## 13. Ejemplo de unidades systemd (referencia)
Servicio API (`/etc/systemd/system/whatsapp-api.service`):
```ini
[Unit]
Description=WhatsApp Platform API
After=network.target

[Service]
WorkingDirectory=/opt/whatsapp_platform_v1/apps/api
EnvironmentFile=/opt/whatsapp_platform_v1/apps/api/.env
ExecStart=/usr/bin/node dist/main.js
Restart=always
RestartSec=5
User=www-data

[Install]
WantedBy=multi-user.target
```

Servicio Web (`/etc/systemd/system/whatsapp-web.service`):
```ini
[Unit]
Description=WhatsApp Platform Web
After=network.target

[Service]
WorkingDirectory=/opt/whatsapp_platform_v1/apps/web
EnvironmentFile=/opt/whatsapp_platform_v1/apps/web/.env.local
ExecStart=/usr/bin/npm run start
Restart=always
RestartSec=5
User=www-data

[Install]
WantedBy=multi-user.target
```

## 14. Reverse proxy (Nginx referencia)
```nginx
server {
  listen 443 ssl;
  server_name tu-dominio.com;

  # ssl_certificate ...
  # ssl_certificate_key ...

  location /api/ {
    proxy_pass http://127.0.0.1:3001/api/;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

## 15. Seguridad operativa obligatoria
1. TLS obligatorio en produccion.
2. 2FA obligatorio para admin/supervisor.
3. Rotacion periodica de secretos.
4. Restriccion de puertos por firewall.
5. Hardening de host y usuario no-root para servicios.
6. Verificacion de firmas en webhooks externos.

## 16. Backups y continuidad
Politica recomendada:
1. Incremental cada 15 min.
2. Full diario.
3. Restore siempre primero en staging.

Checklist restore:
1. Verificar checksum.
2. Validar consistencia de datos.
3. Ejecutar smoke tests.
4. Confirmar RTO/RPO.

## 17. Observabilidad y SRE
Minimos:
1. Logs estructurados con `request_id`.
2. Monitoreo de latencia p95 de API.
3. Monitoreo de error rate.
4. Alertas de fallos en backups.
5. Alertas de degradacion de integraciones IA/WhatsApp.

## 18. Runbook de rollback
1. Identificar version desplegada y version estable previa.
2. Revertir artefactos a version previa.
3. Reiniciar servicios.
4. Validar `/api/v1/health`.
5. Ejecutar smoke tests.
6. Monitorear 30-60 min.

## 19. Troubleshooting rapido
1. `401/403` recurrentes:
   - validar `JWT_SECRET` y expiraciones,
   - validar 2FA y roles.
2. Web no conecta API:
   - validar `API_BASE_URL` y CORS.
3. E2E web falla por browser:
   - ejecutar `npx playwright install chromium`.
4. Build falla por tipos:
   - ejecutar `npm run build` por proyecto y corregir tipado.
5. Error de deploy por puertos:
   - verificar procesos activos en `3000/3001`.

## 20. Checklist final de go-live
1. CI en verde en `main`.
2. Variables de entorno configuradas.
3. Secrets definidos en entorno destino.
4. Reverse proxy + TLS funcionando.
5. Backups configurados y probados.
6. Logs y alertas activos.
7. Runbook de rollback validado.

## 21. Comandos de operacion diaria
```bash
# API
cd apps/api
npm run build
npm run test:e2e

# WEB
cd apps/web
npm run build
npm run test:e2e
```

## 22. Evolucion recomendada (siguiente fase)
1. Reemplazar `InMemoryStore` por repositorios Prisma en API.
2. Anadir Dockerfiles oficiales para API y Web.
3. Anadir workflow de deploy a staging/prod con environments de GitHub.
4. Anadir escaneo SAST/Dependency scanning en CI.
5. Anadir tablero unificado de observabilidad.
