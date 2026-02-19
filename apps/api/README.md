# Apps/API Skeleton (NestJS)

## Objetivo
Esqueleto funcional para la API de la plataforma multiagente WhatsApp con:
- Auth + 2FA (flujo base)
- RBAC/ABAC por `agent_id`
- Módulos operativos (agentes, conversaciones, mensajes, dashboard)
- Módulos de soporte (reportes, backups, IA, MCP, skills, webhooks)

## Comandos
```bash
cd apps/api
npm install
npm run start:dev
```

## Base URL
`http://localhost:3001/api/v1`

## Credenciales demo
- `admin@platform.local` / `ChangeMe123!` (requiere 2FA)
- `supervisor@platform.local` / `ChangeMe123!` (requiere 2FA)
- `agente01@platform.local` / `ChangeMe123!`

Codigo 2FA demo: cualquier string de 6+ caracteres.

## Endpoints clave
- `POST /auth/login`
- `POST /auth/2fa/verify`
- `GET /auth/me`
- `GET /wa-agents`
- `GET /conversations`
- `POST /messages/send-text`
- `POST /messages/send-media`
- `GET /dashboard/overview`
- `POST /reports/generate`
- `POST /backups/run`
- `POST /ai/chat`
- `GET /mcp/connections`
- `POST /skills/execute`
- `POST /webhooks/whatsapp`

## Nota de persistencia
Este skeleton usa `InMemoryStore` para comportamiento funcional inmediato.
Integrar Prisma real reemplazando servicios por repositorios con `@prisma/client`.
