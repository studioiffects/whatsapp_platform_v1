---
name: testing-quality-assurance
description: Definir estrategia y ejecucion de pruebas para API y web, incluyendo E2E, pruebas de autorizacion y validacion de regresiones. Usar cuando se agreguen funcionalidades, endpoints, pantallas o cambios de seguridad que requieran cobertura verificable.
---

# Testing Quality Assurance Skill

## Objetivo
Prevenir regresiones funcionales y de seguridad con pruebas automatizadas de alto valor.

## Cargar contexto minimo
1. Leer `apps/api/test/app.e2e-spec.ts`.
2. Leer `apps/api/test/jest-e2e.json`.
3. Leer `apps/web/tests/e2e/auth-dashboard.spec.ts`.
4. Leer `apps/web/playwright.config.ts`.
5. Leer `docs/RBAC_MATRIX.md`.

## Cobertura minima obligatoria
1. Auth + 2FA.
2. RBAC/ABAC por endpoint.
3. Conversaciones y mensajeria.
4. Reportes y backups por rol.
5. AI/MCP/skills en paths permitidos.
6. Login web y navegacion por rol.

## Estrategia por capa
1. API E2E para validar contrato real y seguridad.
2. Web E2E para validar UX critica y flujo de negocio.
3. Unit tests para logica aislada cuando aplique.

## Reglas para pruebas nuevas
1. Probar happy path.
2. Probar denegacion por rol/scope.
3. Probar errores de validacion.
4. Mantener datos de prueba deterministas.
5. Evitar dependencias externas no controladas.

## Comandos de ejecucion
```bash
cd apps/api
npm run test:e2e

cd apps/web
npm run test:e2e
```

## Reglas de calidad en PR
1. Build API debe pasar.
2. Build web debe pasar.
3. E2E API debe pasar.
4. E2E web debe pasar.
5. No aceptar PR con pruebas rotas.

## Diagnostico de fallas frecuentes
1. Error de ruta o prefijo API.
2. Error de tokens/sesion.
3. Error por cambio de contrato OpenAPI.
4. Error por race conditions de inicializacion.
5. Error por permisos de entorno sandbox/CI.

## Checklist de cierre QA
1. Riesgos residuales identificados.
2. Cobertura actualizada en modulos tocados.
3. Reporte de tests anexado al cambio.
4. Casos de seguridad verificados.

## Entregable
1. Tests automatizados versionados.
2. Resultado de ejecucion documentado.
3. Plan de pruebas para futuros cambios.
