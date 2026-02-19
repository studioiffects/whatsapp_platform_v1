---
name: backup-disaster-recovery
description: Operar y evolucionar la estrategia de backups, retencion y restore de la plataforma. Usar cuando se cambien politicas de respaldo, automatizaciones de backup, procedimientos de restauracion o controles de continuidad operativa.
---

# Backup Disaster Recovery Skill

## Objetivo
Garantizar continuidad operativa y recuperacion controlada ante incidentes de datos.

## Cargar contexto minimo
1. Leer `apps/api/src/backups/`.
2. Leer `packages/db/prisma/migrations/20260219_init/migration.sql`.
3. Leer `docs/DB_BOOTSTRAP.md`.
4. Leer `BLUE_PRINT_EJECUTABLE.MD` seccion backup/restore.
5. Leer `docs/RBAC_MATRIX.md` para permisos de backup.

## Politica base recomendada
1. Backup incremental cada 15 minutos.
2. Backup full diario.
3. Retencion:
   - incremental 7 dias,
   - full 30 dias.

## Reglas de seguridad
1. Permitir `run backup` a admin y supervisor.
2. Permitir `restore` solo a admin.
3. Exigir 2FA para operaciones criticas.
4. Cifrar artefactos en reposo.
5. Auditar ejecucion y restore.

## Flujo de backup
1. Crear job con tipo (`FULL`/`INCREMENTAL`).
2. Ejecutar snapshot de datos relevantes.
3. Calcular checksum.
4. Registrar metadata del job.
5. Exponer historial para supervisores/admin.

## Flujo de restore seguro
1. Seleccionar backup por ID.
2. Restaurar primero en staging (dry-run).
3. Validar integridad funcional y de datos.
4. Programar ventana de restore productivo si aplica.
5. Verificar KPIs de salud post-restore.

## Contenido minimo del backup
1. Base de datos transaccional.
2. Archivos de conversaciones JSONL.
3. Media asociada.
4. Configuracion critica necesaria para operacion.

## Validaciones post-backup
1. Verificar checksum.
2. Verificar legibilidad del artefacto.
3. Verificar trazabilidad en `backup_jobs`.
4. Verificar alertas ante fallos.

## Simulacro de DR recomendado
1. Ejecutar restore mensual en entorno controlado.
2. Medir RTO y RPO reales.
3. Registrar desviaciones y acciones correctivas.
4. Ajustar politicas de backup segun resultados.

## Comandos utiles
```bash
cd apps/api
npm run test:e2e
```

## Entregable
1. Politica de backup vigente.
2. Evidencia de restore probado.
3. Runbook DR actualizado.
