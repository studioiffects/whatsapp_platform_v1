---
name: platform-architecture
description: Disenar, evaluar o refactorizar la arquitectura tecnica integral de la plataforma multiagente de WhatsApp. Usar cuando se necesiten decisiones de arquitectura, definicion de modulos, contratos entre componentes, tradeoffs de escalabilidad o cambios transversales que impacten API, web, datos, seguridad y operacion.
---

# Platform Architecture Skill

## Objetivo
Definir y mantener una arquitectura coherente, evolutiva y operable para la plataforma multiagente de WhatsApp.

## Cargar contexto minimo
1. Leer `BLUE_PRINT_EJECUTABLE.MD`.
2. Leer `docs/OPENAPI.yaml`.
3. Leer `docs/RBAC_MATRIX.md`.
4. Revisar `apps/api/src/app.module.ts`.
5. Revisar `apps/web/src/app/(dashboard)/layout.tsx`.

## Arquitectura objetivo del sistema
1. Mantener backend como monolito modular en `apps/api` con limites de modulo claros.
2. Mantener frontend en `apps/web` con App Router y control por rol.
3. Mantener modelo de datos en PostgreSQL/Prisma (`packages/db/prisma`).
4. Mantener colas y tareas programadas para procesos asincronos y backup.
5. Mantener integraciones externas desacopladas con adaptadores.

## Mapa de dominios y ownership
1. Autenticacion y autorizacion.
2. Gestion de agentes WhatsApp.
3. Conversaciones y mensajes.
4. Dashboard y reporteria.
5. Backups y restore.
6. IA, MCP y skills.
7. Webhooks e integracion de canal.
8. Observabilidad y operacion.

## Flujo recomendado para decisiones de arquitectura
1. Delimitar alcance y no-alcance de la solicitud.
2. Listar modulos afectados y archivos impactados.
3. Evaluar impacto en:
   - seguridad (RBAC/ABAC/2FA),
   - datos (migraciones/indexes/consistencia),
   - performance (latencia p95, carga),
   - operacion (deploy, rollback, monitoreo),
   - costo (infra y consumo IA).
4. Elegir opcion con menor costo de cambio y menor riesgo de regresion.
5. Actualizar artefactos fuente de verdad:
   - `BLUE_PRINT_EJECUTABLE.MD`,
   - `docs/OPENAPI.yaml`,
   - `docs/RBAC_MATRIX.md`,
   - codigo correspondiente.

## Reglas de arquitectura
1. No duplicar logica de negocio entre `apps/api` y `apps/web`.
2. No confiar en restricciones de frontend para seguridad.
3. No crear acoplamientos directos entre modulos no relacionados.
4. Centralizar tipado y contratos de datos.
5. Priorizar cambios incrementales y reversibles.

## Contratos entre capas
1. API define contrato externo versionado (`/api/v1`).
2. Frontend consume API via cliente tipado (`apps/web/src/lib/api/client.ts`).
3. Persistencia encapsula schema y migraciones en Prisma.
4. Integraciones externas pasan por servicios dedicados.

## Decisiones de escalado
1. Escalar verticalmente mientras existan 10 agentes y carga moderada.
2. Escalar horizontalmente API/worker cuando suba concurrencia.
3. Separar microservicios solo cuando exista cuello de botella validado.
4. Mantener cola para operaciones lentas y no bloquear request-response.

## Checklist de calidad arquitectonica
1. Verificar build API y web.
2. Ejecutar pruebas E2E API y web.
3. Verificar permisos por rol en endpoints nuevos.
4. Verificar cobertura de observabilidad en cambios criticos.
5. Verificar plan de rollback.

## Comandos operativos
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

## Entregable esperado al resolver solicitudes de arquitectura
1. Resumen de decision tecnica.
2. Lista de archivos modificados por capa.
3. Riesgos y mitigaciones.
4. Validaciones ejecutadas y resultado.
