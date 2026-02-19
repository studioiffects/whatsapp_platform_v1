---
name: runtime-parameters-config
description: Definir, validar y gobernar parametros de configuracion y variables de entorno para API, web, integraciones y operacion. Usar cuando se agreguen nuevos parametros, se preparen entornos (dev/staging/prod) o se diagnostiquen errores por configuracion.
---

# Runtime Parameters Config Skill

## Objetivo
Mantener configuracion explicita, segura y consistente en todos los entornos.

## Cargar contexto minimo
1. Leer `apps/api/.env.example`.
2. Leer `apps/web/.env.example`.
3. Leer `apps/api/src/main.ts`.
4. Leer `apps/web/src/lib/api/base.ts`.
5. Leer `apps/web/src/lib/auth/config.ts`.

## Parametros API actuales
1. `PORT`
2. `JWT_SECRET`
3. `JWT_EXPIRES_IN`
4. `JWT_REFRESH_EXPIRES_IN`
5. `DEFAULT_PASSWORD`

## Parametros Web actuales
1. `NEXTAUTH_URL`
2. `NEXTAUTH_SECRET`
3. `API_BASE_URL`
4. `NEXT_PUBLIC_API_BASE_URL`

## Reglas de configuracion
1. Mantener `.env.example` actualizado al agregar variable nueva.
2. No commitear secretos reales.
3. Definir defaults solo para desarrollo local.
4. Validar formato y obligatoriedad al inicio de app.

## Patron para agregar parametro nuevo
1. Agregar variable en `.env.example` del servicio.
2. Agregar consumo tipado en modulo correspondiente.
3. Agregar validacion de presencia/formato.
4. Documentar uso y entorno donde aplica.
5. Probar build y flujo funcional asociado.

## Reglas de secretos
1. Guardar secretos en gestor seguro (CI secrets o vault).
2. Rotar `JWT_SECRET` y `NEXTAUTH_SECRET` en cambios de entorno.
3. No imprimir secretos en logs.
4. No enviar secretos al cliente web.

## Checklist de diagnostico por configuracion
1. Confirmar que variables existen en runtime.
2. Confirmar que URL API coincide entre web y API.
3. Confirmar que secretos no estan vacios.
4. Confirmar que puertos no colisionan.
5. Confirmar que CORS permite origen web.

## Validacion tecnica
```bash
cd apps/api
npm run build

cd apps/web
npm run build
```

## Entregable
1. Parametros nuevos documentados y versionados.
2. Configuracion local reproducible.
3. Riesgos por configuracion identificados.
