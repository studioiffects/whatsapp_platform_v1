# Integracion NestJS - RBAC/ABAC

## Archivos base creados
- `apps/api/src/auth/roles.enum.ts`
- `apps/api/src/auth/interfaces/auth-user.interface.ts`
- `apps/api/src/auth/decorators/*.ts`
- `apps/api/src/auth/guards/*.ts`
- `apps/api/src/auth/index.ts`

## Orden recomendado de guards
1. `JwtAuthGuard`
2. `MfaGuard`
3. `RolesGuard`
4. `AgentScopeGuard`

## Uso rapido en endpoint
```ts
@Authorized({
  roles: [AppRole.ADMIN_TECH, AppRole.SUPERVISOR, AppRole.AGENT_OPERATIVE],
  agentScope: { source: "param", key: "id" }
})
@Get("api/v1/dashboard/agents/:id/kpi")
getAgentKpi() {}
```

## Contrato esperado en `request.user`
```ts
{
  id: string;
  role: "ADMIN_TECH" | "SUPERVISOR" | "AGENT_OPERATIVE";
  agentScopes: string[];
  mfaVerified: boolean;
}
```

## Notas de implementacion
1. `JwtAuthGuard` requiere estrategia `passport-jwt` que inserte `request.user`.
2. `AgentScopeGuard` solo restringe a `AGENT_OPERATIVE`; admin/supervisor pasan por diseno.
3. Para endpoints sin `agentId`, no aplicar `agentScope` o usar `optional: true`.
4. Auditar acceso permitido y denegado en middleware/interceptor global.
