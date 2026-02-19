import { ForbiddenException } from "@nestjs/common";
import { AuthUser } from "../../auth/interfaces/auth-user.interface";
import { AppRole } from "../../auth/roles.enum";

export function canAccessAgent(user: AuthUser, agentId: string): boolean {
  if (user.role === AppRole.ADMIN_TECH || user.role === AppRole.SUPERVISOR) {
    return true;
  }

  return user.agentScopes.includes(agentId);
}

export function assertAgentAccess(user: AuthUser, agentId: string): void {
  if (!canAccessAgent(user, agentId)) {
    throw new ForbiddenException("Cross-agent access denied");
  }
}

export function scopeAgentIds(user: AuthUser, allAgentIds: string[]): string[] {
  if (user.role === AppRole.ADMIN_TECH || user.role === AppRole.SUPERVISOR) {
    return allAgentIds;
  }

  return allAgentIds.filter((id) => user.agentScopes.includes(id));
}
