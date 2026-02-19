---
name: security-auth-rbac
description: Implementar y validar autenticacion, MFA, RBAC y ABAC por agente en API y web. Usar cuando se agreguen endpoints, permisos, sesiones, flujos de login/2FA o controles de acceso que impacten seguridad del sistema.
---

# Security Auth RBAC Skill

## Objetivo
Mantener control de acceso robusto y consistente para los roles `ADMIN_TECH`, `SUPERVISOR` y `AGENT_OPERATIVE`.

## Cargar contexto minimo
1. Leer `docs/RBAC_MATRIX.md`.
2. Leer `apps/api/src/auth/`.
3. Leer `apps/web/src/lib/auth/config.ts`.
4. Leer `apps/web/src/lib/auth/permissions.ts`.
5. Leer `docs/OPENAPI.yaml`.

## Reglas base de seguridad
1. Aplicar autenticacion en backend, no solo en frontend.
2. Exigir 2FA para `ADMIN_TECH` y `SUPERVISOR`.
3. Limitar `AGENT_OPERATIVE` a su `agent_id` asignado.
4. Auditar acciones criticas y accesos denegados.
5. No exponer secretos en codigo o logs.

## Flujo de autorizacion en API
1. `JwtAuthGuard`.
2. `MfaGuard`.
3. `RolesGuard`.
4. `AgentScopeGuard`.

## Archivos clave de enforcement
1. `apps/api/src/auth/decorators/authorized.decorator.ts`.
2. `apps/api/src/auth/guards/roles.guard.ts`.
3. `apps/api/src/auth/guards/mfa.guard.ts`.
4. `apps/api/src/auth/guards/agent-scope.guard.ts`.

## Patron para endpoint nuevo protegido
1. Definir roles permitidos.
2. Definir si requiere 2FA explicita.
3. Definir fuente de `agent_id`:
   - `param`,
   - `query`,
   - `body`.
4. Decorar endpoint con `@Authorized(...)`.
5. Agregar prueba positiva y negativa por rol/scope.

## Reglas para frontend
1. No mostrar menu/acciones no permitidas por rol.
2. No depender del frontend para seguridad final.
3. Redirigir usuarios no autenticados a `/login`.
4. Usar `middleware.ts` para guardado de rutas.

## Parametros y secretos
1. Definir `NEXTAUTH_SECRET`, `JWT_SECRET` y credenciales via variables de entorno.
2. Nunca commitear `.env.local`.
3. Rotar secretos en incidentes o cambios de entorno.

## Hardening recomendado
1. Limitar intentos de login y 2FA.
2. Agregar expiracion corta de access token.
3. Agregar revocacion de sesion por `session_id`.
4. Agregar validacion de firma en webhooks siempre.

## Pruebas obligatorias de seguridad
1. Login correcto y rechazo de password invalido.
2. Verificacion 2FA requerida para admin/supervisor.
3. Denegacion de acceso cruzado entre agentes.
4. Denegacion de acciones de backup/report a agente operativo.

## Comandos de validacion
```bash
cd apps/api
npm run test:e2e

cd apps/web
npm run test:e2e
```

## Entregable al aplicar cambios de seguridad
1. Matriz de permisos actualizada si cambia RBAC.
2. Lista de endpoints impactados.
3. Resultado de pruebas de autorizacion.
