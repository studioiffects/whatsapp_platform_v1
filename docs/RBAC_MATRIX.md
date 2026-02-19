# RBAC Matrix - WhatsApp Multiagente Platform

## 1) Roles
- `ADMIN_TECH`: acceso completo, incluyendo configuracion tecnica, seguridad e integraciones.
- `SUPERVISOR`: acceso operativo completo de monitoreo, reportes y backups, sin cambios tecnicos.
- `AGENT_OPERATIVE`: acceso restringido al `agent_id` asignado.

## 2) Scope Rules (ABAC)
1. Para `AGENT_OPERATIVE`, toda consulta/accion debe validar `resource.agent_id in user.agent_scopes`.
2. Si `agentId` llega por query o body, el backend debe forzarlo al scope permitido.
3. Ninguna restriccion de scope se implementa solo en frontend.

## 3) Enforcement Order
1. Autenticacion (`401` si falla).
2. Verificacion de 2FA cuando aplique (`403` si no verificado).
3. RBAC por endpoint (`403` si rol no permitido).
4. ABAC por `agent_id` (`403` si sale de scope).
5. Auditoria de accion (exito o rechazo).

## 4) Endpoint Permission Matrix
| Method | Endpoint | ADMIN_TECH | SUPERVISOR | AGENT_OPERATIVE | Scope Rule | Audit Action |
|---|---|---|---|---|---|---|
| POST | `/api/v1/auth/login` | SI | SI | SI | N/A | `auth.login` |
| POST | `/api/v1/auth/2fa/verify` | SI | SI | SI | N/A | `auth.2fa.verify` |
| POST | `/api/v1/auth/logout` | SI | SI | SI | N/A | `auth.logout` |
| GET | `/api/v1/auth/me` | SI | SI | SI | N/A | `auth.me.read` |
| GET | `/api/v1/wa-agents` | SI | SI | SI | AGENT solo agentes en scope | `wa_agent.list` |
| GET | `/api/v1/wa-agents/:id` | SI | SI | SI | AGENT solo `:id` en scope | `wa_agent.read` |
| PATCH | `/api/v1/wa-agents/:id/config` | SI | NO | NO | N/A | `wa_agent.config.update` |
| GET | `/api/v1/wa-agents/:id/health` | SI | SI | SI | AGENT solo `:id` en scope | `wa_agent.health.read` |
| GET | `/api/v1/conversations` | SI | SI | SI | AGENT solo conversaciones de su scope | `conversation.list` |
| GET | `/api/v1/conversations/:id/messages` | SI | SI | SI | AGENT solo si la conversacion pertenece a su scope | `message.list` |
| POST | `/api/v1/messages/send-text` | SI | SI | SI | AGENT solo `agentId` en scope | `message.send.text` |
| POST | `/api/v1/messages/send-media` | SI | SI | SI | AGENT solo `agentId` en scope | `message.send.media` |
| POST | `/api/v1/webhooks/whatsapp` | N/A | N/A | N/A | Firma provider valida | `webhook.whatsapp.receive` |
| GET | `/api/v1/dashboard/overview` | SI | SI | LIMITADO | AGENT solo KPIs de su scope | `dashboard.overview.read` |
| GET | `/api/v1/dashboard/agents/:id/kpi` | SI | SI | SI | AGENT solo `:id` en scope | `dashboard.agent_kpi.read` |
| POST | `/api/v1/reports/generate` | SI | SI | NO | N/A | `report.generate` |
| GET | `/api/v1/reports/:id/download` | SI | SI | NO | N/A | `report.download` |
| POST | `/api/v1/backups/run` | SI | SI | NO | N/A | `backup.run` |
| GET | `/api/v1/backups` | SI | SI | NO | N/A | `backup.list` |
| POST | `/api/v1/backups/restore` | SI | NO | NO | N/A | `backup.restore` |
| POST | `/api/v1/ai/chat` | SI | SI | SI | AGENT con limite de scope y cuota | `ai.chat` |
| POST | `/api/v1/ai/chat/stream` | SI | SI | SI | AGENT con limite de scope y cuota | `ai.chat.stream` |
| GET | `/api/v1/ai/providers` | SI | SI | SI | Solo providers habilitados por politica | `ai.providers.list` |
| POST | `/api/v1/ai/providers/test` | SI | NO | NO | N/A | `ai.provider.test` |
| GET | `/api/v1/mcp/connections` | SI | SI | NO | N/A | `mcp.connection.list` |
| POST | `/api/v1/mcp/connections` | SI | NO | NO | N/A | `mcp.connection.create` |
| POST | `/api/v1/skills/execute` | SI | SI | SI | AGENT solo skills permitidas en su scope | `skill.execute` |

## 5) 2FA Policy
1. `ADMIN_TECH`: obligatorio.
2. `SUPERVISOR`: obligatorio.
3. `AGENT_OPERATIVE`: opcional por defecto, forzable por politica global.

## 6) Quotas and Limits
1. `AGENT_OPERATIVE`:
   - `ai.chat`: limite por minuto y por dia.
   - ejecucion skills: solo allow-list definida.
2. `SUPERVISOR`:
   - sin acceso a configuraciones tecnicas.
3. `ADMIN_TECH`:
   - sin cuotas operativas, pero auditado al 100%.

## 7) Backend Guard Contract (pseudo-code)
```ts
function authorize(user, endpoint, resourceAgentId?) {
  assertAuthenticated(user);
  assert2faIfRequired(user);
  assertRoleAllowed(user.role, endpoint);
  if (resourceAgentId) {
    assertAgentScope(user, resourceAgentId);
  }
  writeAuditLog(user, endpoint);
}
```

## 8) Required Authorization Tests
1. Cada endpoint debe tener al menos:
   - caso permitido por rol.
   - caso denegado por rol.
   - caso denegado por scope (para endpoints con `agent_id`).
2. Incluir tests de regresion para:
   - manipulacion de `agentId` en query/body.
   - intento de acceso cruzado entre agentes.
   - bypass de 2FA en roles obligatorios.
