---
name: deployment-ci-cd
description: Disenar y operar pipelines CI/CD para build, pruebas E2E y despliegue de la plataforma API/Web. Usar cuando se configure GitHub Actions, estrategias de release, versionado, rollback o promocion de ambientes.
---

# Deployment CI CD Skill

## Objetivo
Automatizar calidad y despliegue con pipelines repetibles y trazables.

## Cargar contexto minimo
1. Leer `.github/workflows/ci.yml`.
2. Leer `apps/api/package.json`.
3. Leer `apps/web/package.json`.
4. Leer `apps/web/playwright.config.ts`.
5. Leer `docs/DB_BOOTSTRAP.md`.

## Pipeline actual
1. Job `api-ci`:
   - `npm ci`,
   - `npm run build`,
   - `npm run test:e2e`.
2. Job `web-ci`:
   - instala deps API y Web,
   - `npm run build` web,
   - instala chromium playwright,
   - ejecuta `npm run test:e2e`.

## Reglas de CI
1. No permitir merge si falla build o E2E.
2. Mantener lockfiles actualizados.
3. Mantener dependencias de test versionadas.
4. Mantener reproducibilidad de pipeline en Linux.

## Patron para agregar verificacion nueva
1. Agregar script en `package.json`.
2. Agregar step en workflow con nombre claro.
3. Fallar pipeline ante regresion.
4. Publicar artefactos de falla (logs/reportes) cuando aplique.

## Patron para release
1. Ejecutar CI completo.
2. Aplicar migraciones en ambiente destino.
3. Deploy API.
4. Deploy Web.
5. Ejecutar smoke tests.
6. Monitorear y rollback si hay degradacion.

## Rollback strategy
1. Revertir release y redeploy version anterior.
2. Revertir migracion solo si fue compatible y planificada.
3. Verificar salud API y web.
4. Re-ejecutar smoke tests.

## Variables y secretos CI minimos
1. Secrets de despliegue (si hay cloud).
2. Secrets de notificaciones.
3. Variables de entorno para staging/prod.
4. No usar secretos hardcodeados en workflow.

## Checklist de robustez CI/CD
1. Pipeline corre en push y PR.
2. Pipeline valida API y web.
3. Pipeline instala browser E2E.
4. Pipeline evita pasos manuales innecesarios.

## Entregable
1. Workflow versionado y funcional.
2. Estrategia de release documentada.
3. Plan de rollback probado.
