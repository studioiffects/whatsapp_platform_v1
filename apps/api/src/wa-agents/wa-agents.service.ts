import { Injectable, NotFoundException } from "@nestjs/common";
import { AuthUser } from "../auth/interfaces/auth-user.interface";
import { assertAgentAccess, scopeAgentIds } from "../common/utils/agent-scope.util";
import { InMemoryStore } from "../store/in-memory.store";
import { UpdateAgentConfigDto } from "./dto/update-agent-config.dto";

@Injectable()
export class WAAgentsService {
  constructor(private readonly store: InMemoryStore) {}

  list(user: AuthUser) {
    const allowedIds = scopeAgentIds(
      user,
      this.store.agents.map((agent) => agent.id),
    );
    return this.store.agents.filter((agent) => allowedIds.includes(agent.id));
  }

  getById(user: AuthUser, id: string) {
    assertAgentAccess(user, id);
    const agent = this.store.agents.find((item) => item.id === id);
    if (!agent) {
      throw new NotFoundException("Agent not found");
    }
    return agent;
  }

  updateConfig(id: string, body: UpdateAgentConfigDto) {
    const agent = this.store.agents.find((item) => item.id === id);
    if (!agent) {
      throw new NotFoundException("Agent not found");
    }

    if (body.displayName) {
      agent.displayName = body.displayName;
    }

    return agent;
  }

  health(user: AuthUser, id: string) {
    const agent = this.getById(user, id);
    return {
      agentId: agent.id,
      connected: agent.status === "CONNECTED",
      latencyMs: 120,
      lastSyncAt: new Date().toISOString(),
    };
  }
}
