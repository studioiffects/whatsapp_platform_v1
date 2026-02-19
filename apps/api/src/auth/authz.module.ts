import { Module } from "@nestjs/common";
import { AgentScopeGuard } from "./guards/agent-scope.guard";
import { MfaGuard } from "./guards/mfa.guard";
import { RolesGuard } from "./guards/roles.guard";

@Module({
  providers: [MfaGuard, RolesGuard, AgentScopeGuard],
  exports: [MfaGuard, RolesGuard, AgentScopeGuard],
})
export class AuthzModule {}
