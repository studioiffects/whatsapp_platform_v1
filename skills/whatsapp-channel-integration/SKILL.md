---
name: whatsapp-channel-integration
description: Implementar y mantener la integracion del canal WhatsApp: webhooks, normalizacion de eventos, envio de mensajes, media y archivado local de conversaciones. Usar cuando se cambie la API de proveedor, eventos de canal, logica de mensajes o trazabilidad de conversaciones.
---

# WhatsApp Channel Integration Skill

## Objetivo
Garantizar mensajeria bidireccional estable entre clientes WhatsApp y la consola operativa.

## Cargar contexto minimo
1. Leer `apps/api/src/webhooks/`.
2. Leer `apps/api/src/messages/`.
3. Leer `apps/api/src/archive/`.
4. Leer `docs/OPENAPI.yaml` seccion webhook y mensajes.
5. Leer `BLUE_PRINT_EJECUTABLE.MD` secciones de canal.

## Flujos de canal soportados
1. Ingreso de eventos por webhook:
   - `message.received`,
   - `message.status.updated`,
   - `conversation.updated`.
2. Envio de mensajes de texto.
3. Envio de mensajes media.
4. Persistencia local JSONL por agente/fecha.

## Reglas de webhook
1. Validar headers de firma y timestamp antes de procesar.
2. Responder rapido y evitar trabajo pesado en request thread.
3. Normalizar payload a modelo interno.
4. Crear conversacion si no existe.
5. Emitir evento realtime para UI.

## Reglas de envio de mensajes
1. Validar `agentId` y scope por usuario.
2. Validar existencia de conversacion para agente.
3. Registrar `providerMessageId`.
4. Guardar mensaje saliente en store/DB.
5. Archivar mensaje en JSONL.

## Persistencia local requerida
1. Guardar en `storage/conversations/<agentId>/<YYYY-MM-DD>.jsonl`.
2. Escribir formato append-only por linea JSON.
3. Incluir:
   - `ts`,
   - `agentId`,
   - `conversationId`,
   - `direction`,
   - `type`,
   - `text`,
   - `providerMessageId`.

## Reglas para media
1. Validar mimetype permitido.
2. Resolver `messageType` por mimetype.
3. Guardar metadata de archivo enviada.
4. Mantener nombre de archivo deterministico si aplica.

## Riesgos de canal y mitigacion
1. Reintentos duplicados de webhook.
   - Mitigar con idempotencia por `providerMessageId`.
2. Caida temporal de proveedor.
   - Mitigar con cola y retry exponencial.
3. Payload incompleto.
   - Mitigar con validacion y rechazo controlado.

## Checklist cuando cambie el proveedor de WhatsApp
1. Actualizar DTO de webhook.
2. Actualizar mapeo de campos.
3. Actualizar pruebas E2E de webhook.
4. Validar envio de texto y media.
5. Verificar archivado local.

## Validacion tecnica
```bash
cd apps/api
npm run build
npm run test:e2e
```

## Entregable
1. Contrato actualizado en `docs/OPENAPI.yaml`.
2. Codigo de webhook/mensajes actualizado.
3. Evidencia de pruebas e2e.
