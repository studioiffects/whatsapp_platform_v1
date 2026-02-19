import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AGENT_SCOPE_KEY } from "../constants";
import { AgentScopeConfig } from "../decorators/agent-scope.decorator";
import { AuthUser } from "../interfaces/auth-user.interface";
import { AppRole } from "../roles.enum";

@Injectable()
export class AgentScopeGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const config = this.reflector.getAllAndOverride<AgentScopeConfig>(
      AGENT_SCOPE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!config) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{
      user?: AuthUser;
      params?: Record<string, unknown>;
      query?: Record<string, unknown>;
      body?: Record<string, unknown>;
    }>();

    const user = request.user;
    if (!user) {
      throw new ForbiddenException("Missing authenticated user");
    }

    if (user.role === AppRole.ADMIN_TECH || user.role === AppRole.SUPERVISOR) {
      return true;
    }

    if (user.role !== AppRole.AGENT_OPERATIVE) {
      throw new ForbiddenException("Role not supported for agent scope");
    }

    if (!Array.isArray(user.agentScopes) || user.agentScopes.length === 0) {
      throw new ForbiddenException("User has no assigned agent scope");
    }

    const resourceAgentId = this.extractAgentId(request, config);
    if (!resourceAgentId) {
      if (config.optional) {
        return true;
      }
      throw new ForbiddenException("Missing required agent scope input");
    }

    if (!user.agentScopes.includes(resourceAgentId)) {
      throw new ForbiddenException("Cross-agent access denied");
    }

    return true;
  }

  private extractAgentId(
    request: {
      params?: Record<string, unknown>;
      query?: Record<string, unknown>;
      body?: Record<string, unknown>;
    },
    config: AgentScopeConfig,
  ): string | null {
    let value: unknown;

    if (config.source === "param") {
      value = request.params?.[config.key];
    } else if (config.source === "query") {
      value = request.query?.[config.key];
    } else {
      value = request.body?.[config.key];
    }

    if (Array.isArray(value)) {
      return typeof value[0] === "string" ? value[0] : null;
    }

    return typeof value === "string" && value.trim().length > 0
      ? value
      : null;
  }
}
