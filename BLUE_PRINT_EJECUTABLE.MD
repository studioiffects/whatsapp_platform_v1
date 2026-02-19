---
name: whatsapp-multiagente-blueprint
description: Blueprint tecnico ejecutable para construir una plataforma web multiagente de WhatsApp (10 agentes) con roles Administrador Tecnico, Supervisor y Agente Operativo, autenticacion Auth.js con 2FA, dashboard, persistencia de conversaciones, backups programados, integraciones MCP/Skills/SQL y orquestacion multi-modelo de IA (OpenAI, Gemini, Claude, Grok, Ollama, llama.cpp).
---

# Blueprint Tecnico Ejecutable

## 1) Objetivo
Implementar una plataforma web moderna, estable y rapida para operar 10 agentes de WhatsApp con control estricto por rol, trazabilidad completa de conversaciones, integracion con IA y mecanismos de backup/restauracion.

## 2) Alcance funcional obligatorio
1. Plataforma web con login seguro (`Auth.js`) y 2FA.
2. Dashboard completo de operacion para 10 agentes.
3. Integracion con API de WhatsApp para mensajeria bidireccional.
4. Almacenamiento local de conversaciones y backups periodicos.
5. UI moderna con chat estilo WhatsApp (texto, imagen, video, adjuntos).
6. Integraciones con BD, MCP y Skills.
7. Modulo de IA multi-proveedor con chat auxiliar para consultas de datos.

## 3) Principios de arquitectura
1. Iniciar como monolito modular + workers asincronos (evolucionable a microservicios).
2. Separar canal operativo WhatsApp y canal IA interno.
3. Implementar RBAC + ABAC por `agent_id` en backend (nunca solo frontend).
4. Persistencia dual:
   - PostgreSQL para operacion y reportes.
   - Archivo local inmutable para auditoria y respaldo.
5. Toda operacion critica debe quedar auditada.

## 4) Stack recomendado
- Frontend: Next.js (App Router), React, TypeScript, Tailwind, shadcn/ui.
- Auth: Auth.js + TOTP (otplib) + opcion WebAuthn.
- Backend: NestJS (TypeScript), REST + WebSocket Gateway.
- Async: Redis + BullMQ.
- DB: PostgreSQL + Prisma.
- Archivos: Local FS (o NAS) con estructura por agente/fecha.
- Observabilidad: OpenTelemetry + Prometheus + Grafana + Loki.
- Contenedores: Docker + Docker Compose.
- CI/CD: GitHub Actions.

## 5) Estructura de repositorio (monorepo)
```text
whatsapp-platform/
  apps/
    web/                         # Next.js (UI)
    api/                         # NestJS (REST/WebSocket/Webhooks)
    worker/                      # Jobs BullMQ
  packages/
    domain/                      # Tipos, contratos, reglas de negocio
    auth/                        # Config Auth.js, RBAC, 2FA
    db/                          # Prisma schema + migraciones
    ai-orchestrator/             # Adaptadores multi-modelo
    mcp-gateway/                 # Clientes MCP y tools registry
    sdk/                         # Cliente TS para consumir API interna
  infra/
    docker/
      docker-compose.yml
    nginx/
      nginx.conf
    monitoring/
      prometheus.yml
      grafana-dashboards/
  scripts/
    bootstrap.ps1
    seed.ts
    backup-runner.ts
    restore-runner.ts
  docs/
    OPENAPI.yaml
    RBAC_MATRIX.md
    RUNBOOK.md
  BLUE_PRINT_EJECUTABLE.MD
```

## 6) Modelo de seguridad

### 6.1 Roles
- `ADMIN_TECH`
- `SUPERVISOR`
- `AGENT_OPERATIVE`

### 6.2 Reglas de acceso
1. `AGENT_OPERATIVE` solo puede leer/escribir recursos con su `agent_id` asignado.
2. `SUPERVISOR` puede ver todo y exportar reportes/backups, pero no cambiar configuracion tecnica.
3. `ADMIN_TECH` puede todo, incluyendo configuracion de integraciones, seguridad y backup policy.

### 6.3 Auth y 2FA
1. Login con Auth.js.
2. MFA obligatorio para `ADMIN_TECH` y `SUPERVISOR`.
3. MFA opcional/forzado por politica para `AGENT_OPERATIVE`.
4. JWT de sesion con claims:
   - `sub`, `role`, `agent_scopes`, `mfa_verified`, `session_id`.
5. Tokens de corta duracion + refresh rotativo.

## 7) Contratos API (MVP)

### 7.1 Auth
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/2fa/verify`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`

### 7.2 Agentes WhatsApp
- `GET /api/v1/wa-agents`
- `GET /api/v1/wa-agents/:id`
- `PATCH /api/v1/wa-agents/:id/config` (solo `ADMIN_TECH`)
- `GET /api/v1/wa-agents/:id/health`

### 7.3 Conversaciones y mensajes
- `GET /api/v1/conversations?agentId=&status=&from=&to=`
- `GET /api/v1/conversations/:id/messages`
- `POST /api/v1/messages/send-text`
- `POST /api/v1/messages/send-media`
- `POST /api/v1/webhooks/whatsapp` (provider -> plataforma)

### 7.4 Dashboard/reportes/backups
- `GET /api/v1/dashboard/overview`
- `GET /api/v1/dashboard/agents/:id/kpi`
- `POST /api/v1/reports/generate`
- `GET /api/v1/reports/:id/download`
- `POST /api/v1/backups/run`
- `GET /api/v1/backups`
- `POST /api/v1/backups/restore` (solo `ADMIN_TECH`)

### 7.5 IA y conectores
- `POST /api/v1/ai/chat`
- `POST /api/v1/ai/chat/stream`
- `GET /api/v1/ai/providers`
- `POST /api/v1/ai/providers/test` (solo `ADMIN_TECH`)
- `GET /api/v1/mcp/connections`
- `POST /api/v1/mcp/connections`
- `POST /api/v1/skills/execute`

## 8) Matriz de permisos por endpoint (resumen)
| Endpoint | ADMIN_TECH | SUPERVISOR | AGENT_OPERATIVE |
|---|---|---|---|
| `GET /dashboard/overview` | SI | SI | SOLO su KPI |
| `PATCH /wa-agents/:id/config` | SI | NO | NO |
| `GET /conversations` | SI | SI | SOLO su `agent_id` |
| `POST /messages/send-*` | SI | SI | SOLO su `agent_id` |
| `POST /backups/run` | SI | SI | NO |
| `POST /backups/restore` | SI | NO | NO |
| `POST /ai/chat` | SI | SI | SI (con cuotas) |
| `POST /mcp/connections` | SI | NO | NO |

## 9) Esquema SQL inicial (PostgreSQL)
```sql
create table users (
  id uuid primary key default gen_random_uuid(),
  email varchar(255) unique not null,
  password_hash text not null,
  full_name varchar(255) not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table roles (
  id smallserial primary key,
  code varchar(50) unique not null
);

create table user_roles (
  user_id uuid references users(id) on delete cascade,
  role_id smallint references roles(id) on delete cascade,
  primary key (user_id, role_id)
);

create table whatsapp_agents (
  id uuid primary key default gen_random_uuid(),
  code varchar(50) unique not null,
  display_name varchar(100) not null,
  phone_number varchar(30) not null,
  provider_phone_id varchar(100) not null,
  status varchar(30) not null default 'DISCONNECTED',
  created_at timestamptz not null default now()
);

create table user_agent_access (
  user_id uuid references users(id) on delete cascade,
  agent_id uuid references whatsapp_agents(id) on delete cascade,
  primary key (user_id, agent_id)
);

create table conversations (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references whatsapp_agents(id),
  customer_wa_id varchar(100) not null,
  customer_name varchar(255),
  status varchar(30) not null default 'OPEN',
  last_message_at timestamptz,
  created_at timestamptz not null default now()
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  direction varchar(10) not null, -- IN|OUT
  message_type varchar(20) not null, -- TEXT|IMAGE|VIDEO|DOC
  text_content text,
  media_url text,
  mime_type varchar(100),
  provider_message_id varchar(150),
  sent_at timestamptz,
  delivered_at timestamptz,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table backup_jobs (
  id uuid primary key default gen_random_uuid(),
  requested_by uuid references users(id),
  backup_type varchar(20) not null, -- FULL|INCREMENTAL
  status varchar(20) not null, -- PENDING|RUNNING|DONE|FAILED
  started_at timestamptz,
  finished_at timestamptz,
  artifact_path text,
  checksum varchar(128),
  error_message text
);

create table audit_logs (
  id bigserial primary key,
  actor_user_id uuid references users(id),
  action varchar(120) not null,
  resource_type varchar(60) not null,
  resource_id varchar(120),
  payload jsonb,
  created_at timestamptz not null default now()
);

create table ai_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id),
  agent_scope_id uuid references whatsapp_agents(id),
  model_provider varchar(40) not null,
  model_name varchar(120) not null,
  created_at timestamptz not null default now()
);

create table ai_messages (
  id uuid primary key default gen_random_uuid(),
  ai_session_id uuid not null references ai_sessions(id) on delete cascade,
  role varchar(20) not null, -- system|user|assistant|tool
  content text not null,
  meta jsonb,
  created_at timestamptz not null default now()
);
```

## 10) Persistencia local de conversaciones
Guardar JSONL append-only por agente y fecha:
```text
storage/
  conversations/
    agent-01/
      2026-02-19.jsonl
    agent-02/
      2026-02-19.jsonl
  media/
    agent-01/
      2026/02/19/<uuid>.jpg
```

Formato JSONL por linea:
```json
{
  "ts": "2026-02-19T19:45:00Z",
  "agentId": "uuid",
  "conversationId": "uuid",
  "direction": "IN",
  "type": "TEXT",
  "text": "Hola",
  "providerMessageId": "wamid....",
  "sha256": "..."
}
```

## 11) Estrategia de backup y restore

### 11.1 Politica
1. Backup incremental cada 15 min (conversaciones + media nueva).
2. Backup full diario (DB dump + storage snapshot).
3. Retencion:
   - Incrementales: 7 dias.
   - Full: 30 dias.

### 11.2 Flujo tecnico
1. Scheduler crea job en BullMQ segun politica.
2. Worker ejecuta:
   - `pg_dump` para base de datos.
   - empaquetado `tar.gz` de `storage/`.
   - calculo SHA-256.
3. Artifact cifrado (`AES-256`) y guardado en ruta definida.
4. Registrar metadata en `backup_jobs`.

### 11.3 Restore
1. Solo `ADMIN_TECH`.
2. Restaurar en ambiente temporal primero.
3. Ejecutar validaciones de integridad.
4. Promocionar a produccion con ventana controlada.

## 12) Integracion WhatsApp API
1. Exponer webhook firmado: `POST /api/v1/webhooks/whatsapp`.
2. Validar firma y timestamp del proveedor.
3. Responder `200` en <500ms, delegar procesado a cola.
4. Normalizar eventos:
   - `message.received`
   - `message.status.updated`
   - `conversation.updated`
5. Envio de mensajes salientes via endpoint provider con reintentos exponenciales.

## 13) Modulo IA multi-proveedor

### 13.1 Interfaz comun (TypeScript)
```ts
export interface AIProvider {
  name: string;
  chat(input: ChatInput): Promise<ChatOutput>;
  stream?(input: ChatInput): AsyncIterable<StreamChunk>;
  healthCheck(): Promise<boolean>;
}
```

### 13.2 Adaptadores
- `OpenAIProvider`
- `GeminiProvider`
- `ClaudeProvider`
- `GrokProvider`
- `OllamaProvider`
- `LlamaCppProvider`

### 13.3 Politicas
1. Router por costo/latencia/calidad.
2. Limites por rol y por usuario.
3. Redaccion de PII en prompts y logs.
4. Tool calling con allow-list de consultas SQL y herramientas MCP.

## 14) MCP y Skills
1. Mantener `mcp-gateway` como capa unica de acceso.
2. Cada tool debe declarar:
   - `tool_id`
   - `required_role`
   - `allowed_agent_scope`
   - `rate_limit`
3. Todo uso de tool se audita en `audit_logs`.
4. Bloquear herramientas no registradas.

## 15) Dashboard (KPI minimos)
1. Mensajes recibidos/enviados por agente y por hora.
2. Tiempo medio de primera respuesta.
3. Conversaciones abiertas/cerradas.
4. Estado de conexion de los 10 agentes.
5. Tasa de error de envio.
6. Uso de IA por usuario/rol/proveedor.

## 16) UI/UX (moderna y rapida)
1. Layout de 3 paneles:
   - lista de conversaciones
   - chat activo
   - panel de contexto/IA
2. Carga virtualizada de mensajes.
3. Previsualizacion de media.
4. Upload con barra de progreso y reintentos.
5. WebSocket para actualizacion en tiempo real.
6. Responsive desktop/tablet.

## 17) Observabilidad y SLO
1. Logs estructurados con `request_id`, `user_id`, `agent_id`.
2. Trazas distribuidas entre web/api/worker.
3. Metricas:
   - p95 latencia API
   - jobs fallidos
   - tiempo de cola
   - uso CPU/RAM
4. SLO:
   - disponibilidad >= 99.9%
   - `POST /webhooks/whatsapp` p95 < 500ms
   - entrega al agente p95 < 2s

## 18) Bootstrap tecnico (comandos base)
```bash
pnpm dlx create-turbo@latest whatsapp-platform
cd whatsapp-platform
pnpm add -w typescript tsx eslint prettier
pnpm --filter web add next react react-dom next-auth otplib zod
pnpm --filter api add @nestjs/common @nestjs/core @nestjs/platform-express bullmq ioredis zod
pnpm --filter worker add bullmq ioredis prisma @prisma/client
docker compose -f infra/docker/docker-compose.yml up -d
pnpm -r dev
```

## 19) Docker Compose minimo (servicios)
- `postgres:16`
- `redis:7`
- `api`
- `worker`
- `web`
- `prometheus`
- `grafana`
- `loki`

## 20) CI/CD minimo
Pipeline por PR:
1. `pnpm install --frozen-lockfile`
2. `pnpm -r lint`
3. `pnpm -r test`
4. `pnpm -r build`
5. escaneo de seguridad (dependencias y secretos)

Pipeline release:
1. build de imagenes
2. migraciones DB
3. despliegue blue/green
4. smoke tests
5. rollback automatico si falla health-check

## 21) Plan de ejecucion por fases
### Fase 1 (Semanas 1-4)
1. Auth.js + RBAC + 2FA.
2. CRUD de agentes WhatsApp.
3. Webhook + inbox basico + envio texto/media.
4. Persistencia SQL + JSONL local.

### Fase 2 (Semanas 5-7)
1. Dashboard completo.
2. Reportes exportables.
3. Backups programados + restore controlado.
4. Auditoria completa.

### Fase 3 (Semanas 8-10)
1. Orquestador IA multi-proveedor.
2. MCP gateway + skills registry.
3. Politicas de costo/cuotas.

### Fase 4 (Semanas 11-12)
1. Hardening seguridad.
2. Performance tuning.
3. Pruebas de carga y resiliencia.

## 22) Criterios de aceptacion (DoD)
1. Cada endpoint con pruebas unitarias y de integracion.
2. RBAC/ABAC validado con test de autorizacion.
3. 10 agentes concurrentes operativos.
4. Backup/restore probado de punta a punta.
5. Dashboard actualiza en tiempo real sin recarga manual.
6. Auditoria disponible para acciones criticas.
7. Runbook de incidentes y operacion publicado.

## 23) Riesgos y mitigaciones
1. Bloqueo por limites del proveedor WhatsApp.
   - Mitigar con colas, retry y control de rate-limit.
2. Costos IA altos.
   - Mitigar con router de modelos y cuotas por rol.
3. Fuga de datos sensibles.
   - Mitigar con cifrado, redaccion PII, minimo privilegio.
4. Degradacion por picos.
   - Mitigar con autoscaling de API/worker y backpressure.

## 24) Checklist final de implementacion
1. Crear monorepo y paquetes base.
2. Implementar auth + 2FA + RBAC + ABAC.
3. Integrar webhooks y mensajeria saliente.
4. Implementar inbox en tiempo real.
5. Persistir en PostgreSQL y JSONL local.
6. Agregar backup incremental/full y restore.
7. Construir dashboard + reportes.
8. Integrar IA providers + MCP + Skills.
9. Activar observabilidad y alertas.
10. Ejecutar pruebas de carga y hardening.

