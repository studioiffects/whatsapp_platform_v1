---
name: frontend-console-nextjs
description: Construir y mantener la consola web Next.js para operacion multiagente: login, dashboard, inbox, reportes, backups, IA y MCP con control por rol. Usar cuando se requieran cambios de UX, rutas, consumo API, sesiones Auth.js o comportamiento de vistas operativas.
---

# Frontend Console Nextjs Skill

## Objetivo
Entregar UI operativa moderna, estable y rapida alineada con permisos y contratos de API.

## Cargar contexto minimo
1. Leer `apps/web/src/app/layout.tsx`.
2. Leer `apps/web/src/app/(dashboard)/layout.tsx`.
3. Leer `apps/web/src/lib/auth/config.ts`.
4. Leer `apps/web/src/lib/api/client.ts`.
5. Leer `apps/web/src/styles/globals.css`.

## Rutas funcionales actuales
1. `/login`
2. `/dashboard`
3. `/agents`
4. `/conversations`
5. `/reports`
6. `/backups`
7. `/ai`
8. `/mcp`

## Reglas de frontend por rol
1. Ocultar menu no permitido para `AGENT_OPERATIVE`.
2. Mantener validacion de rol en UI y backend.
3. Redirigir usuarios no autenticados a `/login`.
4. Mantener session con Auth.js y middleware.

## Patron para agregar pagina nueva
1. Crear ruta en `apps/web/src/app/(dashboard)/<ruta>/page.tsx`.
2. Agregar opcion de menu en `app-shell.tsx` si aplica.
3. Consumir API mediante `ApiClient` central.
4. Manejar estados:
   - loading,
   - error,
   - empty,
   - success.
5. Agregar prueba E2E para flujo principal.

## Reglas de consumo API
1. Evitar `fetch` directo en componentes cuando exista metodo en `ApiClient`.
2. Mantener tipado de respuestas en `src/lib/types/`.
3. Mantener manejo consistente de errores.
4. No hardcodear URLs, usar variables de entorno.

## Reglas de UI para chat
1. Mantener panel de conversaciones, panel de chat y panel IA.
2. Permitir envio de texto y media.
3. Mostrar estado y timestamps de mensajes.
4. Mantener UX responsive para tablet y desktop.

## Reglas de estilo
1. Mantener tokens en `globals.css`.
2. Mantener componentes reutilizables en `components/ui`.
3. Evitar estilos inline duplicados si se repiten.
4. Evitar dependencia de layout fijo no responsive.

## Variables de entorno clave
1. `NEXTAUTH_URL`
2. `NEXTAUTH_SECRET`
3. `API_BASE_URL`
4. `NEXT_PUBLIC_API_BASE_URL`

## Validacion tecnica
```bash
cd apps/web
npm run build
npm run test:e2e
```

## Entregable
1. Ruta/pantalla funcional con control de rol.
2. Cliente API actualizado.
3. Pruebas E2E actualizadas.
