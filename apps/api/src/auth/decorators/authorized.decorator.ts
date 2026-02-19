import { applyDecorators, UseGuards } from "@nestjs/common";
import { Roles } from "./roles.decorator";
import { MfaRequired } from "./mfa-required.decorator";
import { AgentScope, AgentScopeConfig } from "./agent-scope.decorator";
import { AppRole } from "../roles.enum";
import { JwtAuthGuard } from "../guards/jwt-auth.guard";
import { MfaGuard } from "../guards/mfa.guard";
import { RolesGuard } from "../guards/roles.guard";
import { AgentScopeGuard } from "../guards/agent-scope.guard";

interface AuthorizedOptions {
  roles: AppRole[];
  mfaRequired?: boolean;
  agentScope?: AgentScopeConfig;
}

export const Authorized = (options: AuthorizedOptions) => {
  const decorators: Array<ClassDecorator | MethodDecorator> = [
    UseGuards(JwtAuthGuard, MfaGuard, RolesGuard, AgentScopeGuard),
    Roles(...options.roles),
  ];

  if (typeof options.mfaRequired === "boolean") {
    decorators.push(MfaRequired(options.mfaRequired));
  }

  if (options.agentScope) {
    decorators.push(AgentScope(options.agentScope));
  }

  return applyDecorators(...decorators);
};
