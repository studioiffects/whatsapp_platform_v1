# DB Bootstrap

## 1) Aplicar migraciones
```bash
npx prisma migrate deploy --schema packages/db/prisma/schema.prisma
```

## 2) Ejecutar seed inicial
```bash
psql "$DATABASE_URL" -f packages/db/prisma/seeds/001_initial_seed.sql
```

## 3) Generar cliente Prisma
```bash
npx prisma generate --schema packages/db/prisma/schema.prisma
```

## 4) Verificar datos base
1. Deben existir 3 roles en `roles`.
2. Deben existir 10 registros en `whatsapp_agents`.
3. `agente01@platform.local` debe tener scope solo a `agent-01`.
