---
name: database-prisma-postgres
description: Disenar, evolucionar y validar el modelo de datos PostgreSQL con Prisma para la plataforma multiagente. Usar cuando se requieran cambios de schema, migraciones, seeds, indices, performance de consultas, integridad referencial o estrategias de evolucion de datos.
---

# Database Prisma Postgres Skill

## Objetivo
Gestionar la capa de datos con cambios seguros, auditables y compatibles con la operacion del sistema.

## Cargar contexto minimo
1. Leer `packages/db/prisma/schema.prisma`.
2. Leer `packages/db/prisma/migrations/20260219_init/migration.sql`.
3. Leer `packages/db/prisma/seeds/001_initial_seed.sql`.
4. Leer `docs/DB_BOOTSTRAP.md`.
5. Leer `docs/OPENAPI.yaml` para contratos que dependen de datos.

## Entidades core del dominio
1. `users`, `roles`, `user_roles`.
2. `whatsapp_agents`, `user_agent_access`.
3. `conversations`, `messages`.
4. `backup_jobs`, `audit_logs`.
5. `ai_sessions`, `ai_messages`.

## Flujo estandar para cambios de datos
1. Definir necesidad funcional y campos afectados.
2. Modificar `schema.prisma` primero.
3. Generar migracion nueva versionada.
4. Revisar SQL generado y completar indices/FK si aplica.
5. Actualizar seed solo si el cambio requiere catalogo base.
6. Ejecutar build y pruebas E2E.

## Reglas de migracion
1. No editar migraciones historicas ya aplicadas.
2. No mezclar cambios no relacionados en la misma migracion.
3. Incluir rollback logico y plan de recuperacion.
4. Evitar cambios destructivos sin ventana de mantenimiento.
5. Mantener nombres de columnas consistentes con API.

## Reglas de performance SQL
1. Indexar filtros frecuentes:
   - `conversations(agent_id, status)`,
   - `messages(conversation_id, created_at)`,
   - `audit_logs(actor_user_id, created_at)`.
2. Evitar consultas N+1 en endpoints de listado.
3. Limitar payload y pagina resultados grandes.
4. Medir latencia p95 para consultas criticas.

## Reglas de integridad
1. Enforzar FK y `onDelete` explicitamente.
2. No permitir datos fuera de scope de agente.
3. Mantener enums controlados para estados.
4. Mantener registros de auditoria inmutables.

## Seed y ambientes
1. Mantener seed idempotente.
2. No incluir secretos en seed.
3. Crear usuarios de prueba solo para local/staging.
4. Verificar asignacion de scopes por rol en seed.

## Comandos de trabajo
```bash
# aplicar migraciones
npx prisma migrate deploy --schema packages/db/prisma/schema.prisma

# modo desarrollo
npx prisma migrate dev --schema packages/db/prisma/schema.prisma

# generar cliente
npx prisma generate --schema packages/db/prisma/schema.prisma

# ejecutar seed SQL
psql "$DATABASE_URL" -f packages/db/prisma/seeds/001_initial_seed.sql
```

## Validaciones minimas luego de cambios
1. `npm run build` en `apps/api`.
2. `npm run test:e2e` en `apps/api`.
3. Verificar endpoints que consultan tablas modificadas.
4. Verificar que no haya ruptura de compatibilidad en API.

## Checklist de release de datos
1. Script de migracion versionado.
2. Tiempo estimado de aplicacion.
3. Plan de rollback documentado.
4. Validacion post-deploy con queries de salud.
