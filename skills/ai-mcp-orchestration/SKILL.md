---
name: ai-mcp-orchestration
description: Disenar y operar la capa de IA multi-proveedor, herramientas MCP y ejecucion de skills con politicas de seguridad y costo. Usar cuando se integren nuevos modelos, herramientas, rutas de IA, cuotas o controles de acceso para consultas inteligentes.
---

# AI MCP Orchestration Skill

## Objetivo
Orquestar consultas de IA y herramientas externas con control por rol, scope y trazabilidad.

## Cargar contexto minimo
1. Leer `apps/api/src/ai/`.
2. Leer `apps/api/src/mcp/`.
3. Leer `apps/api/src/skills/`.
4. Leer `docs/RBAC_MATRIX.md`.
5. Leer `docs/OPENAPI.yaml` seccion AI/MCP/skills.

## Capacidades actuales
1. Chat IA no-stream y stream endpoint.
2. Catalogo de proveedores IA.
3. Test de proveedor (admin).
4. Registro de conexiones MCP.
5. Ejecucion de skills con auditoria.

## Politicas de control
1. Restringir `useTools` para `AGENT_OPERATIVE` cuando aplique.
2. Limitar `agentScopeId` a scope de usuario.
3. Permitir gestion MCP solo a `ADMIN_TECH` y `SUPERVISOR`.
4. Auditar ejecucion de skills y tool-calls.

## Patron para integrar proveedor IA nuevo
1. Agregar metadata del proveedor en servicio IA.
2. Agregar validacion en DTO si requiere enum.
3. Definir modelo default y health status.
4. Agregar pruebas de endpoint `ai/chat` y `ai/providers`.
5. Documentar proveedor en OpenAPI.

## Patron para tool MCP nuevo
1. Definir endpoint y auth type.
2. Registrar reglas de acceso por rol.
3. Agregar rate-limit y timeout.
4. Agregar auditoria de ejecucion y error.
5. Probar happy path y path de denegacion.

## Reglas de seguridad IA
1. No exponer secretos de proveedor en respuestas.
2. Evitar pasar PII sin saneamiento.
3. Validar `agentScopeId` siempre en backend.
4. Denegar invocacion de tools fuera de allow-list.

## Reglas de costos
1. Definir proveedor default de bajo costo para consultas simples.
2. Permitir override solo para roles autorizados.
3. Registrar costo estimado por request.
4. Limitar tokens por solicitud y por sesion.

## Reglas de observabilidad IA
1. Medir latencia por proveedor/modelo.
2. Medir tasa de errores por proveedor.
3. Medir costo agregado por rol.
4. Registrar tool calls y fallos de MCP.

## Validacion tecnica
```bash
cd apps/api
npm run build
npm run test:e2e
```

## Entregable
1. Endpoints IA/MCP/skills actualizados.
2. Reglas de seguridad y cuota documentadas.
3. Pruebas y evidencia de no-regresion.
