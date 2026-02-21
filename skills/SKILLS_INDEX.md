# Skills Index

Este indice centraliza los skills tecnicos disponibles en el repositorio.

## Catalogo
| Skill | Descripcion | Path |
|---|---|---|
| `ai-mcp-orchestration` | Disenar y operar la capa de IA multi-proveedor, herramientas MCP y ejecucion de skills con politicas de seguridad y costo. Usar cuando se integren nuevos modelos, herramientas, rutas de IA, cuotas o controles de acceso para consultas inteligentes. | `skills/ai-mcp-orchestration/SKILL.md` |
| `backup-disaster-recovery` | Operar y evolucionar la estrategia de backups, retencion y restore de la plataforma. Usar cuando se cambien politicas de respaldo, automatizaciones de backup, procedimientos de restauracion o controles de continuidad operativa. | `skills/backup-disaster-recovery/SKILL.md` |
| `conexion-mcp-server-aws-gcp` | Conectar y operar MCP servers de AWS y GCP en un mismo entorno (Cursor, Claude, Kiro, etc). Usar cuando se requiera configurar autenticacion, permisos IAM, cliente MCP, validaciones, troubleshooting y hardening. | `skills/conexion-mcp-aws-gcp/SKILL.md` |
| `database-prisma-postgres` | Disenar, evolucionar y validar el modelo de datos PostgreSQL con Prisma para la plataforma multiagente. Usar cuando se requieran cambios de schema, migraciones, seeds, indices, performance de consultas, integridad referencial o estrategias de evolucion de datos. | `skills/database-prisma-postgres/SKILL.md` |
| `deployment-ci-cd` | Disenar y operar pipelines CI/CD para build, pruebas E2E y despliegue de la plataforma API/Web. Usar cuando se configure GitHub Actions, estrategias de release, versionado, rollback o promocion de ambientes. | `skills/deployment-ci-cd/SKILL.md` |
| `frontend-console-nextjs` | Construir y mantener la consola web Next.js para operacion multiagente: login, dashboard, inbox, reportes, backups, IA y MCP con control por rol. Usar cuando se requieran cambios de UX, rutas, consumo API, sesiones Auth.js o comportamiento de vistas operativas. | `skills/frontend-console-nextjs/SKILL.md` |
| `observability-sre` | Definir telemetria, SLOs, alertas y practicas SRE para operar la plataforma con estabilidad y velocidad. Usar cuando se instrumenten logs, metricas, trazas, runbooks, monitoreo de incidentes o planes de capacidad. | `skills/observability-sre/SKILL.md` |
| `platform-architecture` | Disenar, evaluar o refactorizar la arquitectura tecnica integral de la plataforma multiagente de WhatsApp. Usar cuando se necesiten decisiones de arquitectura, definicion de modulos, contratos entre componentes, tradeoffs de escalabilidad o cambios transversales que impacten API, web, datos, seguridad y operacion. | `skills/platform-architecture/SKILL.md` |
| `runtime-parameters-config` | Definir, validar y gobernar parametros de configuracion y variables de entorno para API, web, integraciones y operacion. Usar cuando se agreguen nuevos parametros, se preparen entornos (dev/staging/prod) o se diagnostiquen errores por configuracion. | `skills/runtime-parameters-config/SKILL.md` |
| `security-auth-rbac` | Implementar y validar autenticacion, MFA, RBAC y ABAC por agente en API y web. Usar cuando se agreguen endpoints, permisos, sesiones, flujos de login/2FA o controles de acceso que impacten seguridad del sistema. | `skills/security-auth-rbac/SKILL.md` |
| `testing-quality-assurance` | Definir estrategia y ejecucion de pruebas para API y web, incluyendo E2E, pruebas de autorizacion y validacion de regresiones. Usar cuando se agreguen funcionalidades, endpoints, pantallas o cambios de seguridad que requieran cobertura verificable. | `skills/testing-quality-assurance/SKILL.md` |
| `whatsapp-channel-integration` | Implementar y mantener la integracion del canal WhatsApp: webhooks, normalizacion de eventos, envio de mensajes, media y archivado local de conversaciones. Usar cuando se cambie la API de proveedor, eventos de canal, logica de mensajes o trazabilidad de conversaciones. | `skills/whatsapp-channel-integration/SKILL.md` |

## Convencion de registro
1. Cada carpeta de skill debe incluir `SKILL.md` con frontmatter `name` y `description`.
2. Al crear un skill nuevo, agregar una fila en este indice.
3. Mantener `name` en kebab-case y descripcion orientada a "cuando usarlo".
