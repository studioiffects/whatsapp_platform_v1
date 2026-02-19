---
name: observability-sre
description: Definir telemetria, SLOs, alertas y practicas SRE para operar la plataforma con estabilidad y velocidad. Usar cuando se instrumenten logs, metricas, trazas, runbooks, monitoreo de incidentes o planes de capacidad.
---

# Observability SRE Skill

## Objetivo
Detectar, diagnosticar y resolver fallos rapidamente con senales operativas confiables.

## Cargar contexto minimo
1. Leer `BLUE_PRINT_EJECUTABLE.MD` seccion SLO.
2. Leer `apps/api/src/common/interceptors/request-id.interceptor.ts`.
3. Leer `apps/api/src/common/filters/http-exception.filter.ts`.
4. Leer `apps/api/src/backups/backups.service.ts`.
5. Leer `docs/NEST_AUTH_INTEGRATION.md`.

## Senales minimas obligatorias
1. Logs estructurados.
2. Metricas por endpoint y modulo.
3. Trazas de requests criticos.
4. Estado de jobs asincronos.
5. Estado de integraciones externas (WhatsApp/IA/MCP).

## Campos minimos de log
1. `timestamp`
2. `request_id`
3. `user_id` (si aplica)
4. `agent_id` (si aplica)
5. `route`
6. `status_code`
7. `latency_ms`
8. `error_code` (si hay error)

## SLO sugeridos
1. Disponibilidad API >= 99.9%.
2. Webhook WhatsApp p95 < 500 ms.
3. Entrega operativa de mensaje p95 < 2 s.
4. Error rate API < 1% diario.
5. RTO de restore <= 60 min.

## Alertas recomendadas
1. Spike de 5xx.
2. Latencia p95 por encima de umbral.
3. Backups fallidos consecutivos.
4. Fallos de autenticacion 2FA inusuales.
5. Degradacion de proveedores IA.

## Runbook minimo por incidente
1. Identificar modulo afectado.
2. Correlacionar por `request_id`.
3. Revisar ultimos deploys y cambios.
4. Aplicar mitigacion temporal.
5. Definir accion correctiva permanente.

## Capacity planning
1. Medir mensajes por agente por hora.
2. Medir uso de CPU/RAM API.
3. Medir tamaño de storage JSONL/media.
4. Medir costo y volumen IA por rol.

## Checklist antes de cerrar incidente
1. Servicio recuperado y estable.
2. Monitoreo sin alertas criticas.
3. RCA preliminar registrado.
4. Tarea de remediacion planificada.

## Entregable
1. Instrumentacion implementada.
2. Alertas configuradas con umbrales claros.
3. Runbooks actualizados.
