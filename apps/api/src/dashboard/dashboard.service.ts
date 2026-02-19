import { Injectable } from "@nestjs/common";
import { AuthUser } from "../auth/interfaces/auth-user.interface";
import { AppRole } from "../auth/roles.enum";
import { assertAgentAccess } from "../common/utils/agent-scope.util";
import { InMemoryStore } from "../store/in-memory.store";

@Injectable()
export class DashboardService {
  constructor(private readonly store: InMemoryStore) {}

  overview(user: AuthUser, agentId?: string) {
    const allowedAgentIds =
      user.role === AppRole.AGENT_OPERATIVE
        ? user.agentScopes
        : this.store.agents.map((agent) => agent.id);

    if (agentId) {
      assertAgentAccess(user, agentId);
    }

    const targetIds = agentId ? [agentId] : allowedAgentIds;
    const conversations = this.store.conversations.filter((item) =>
      targetIds.includes(item.agentId),
    );
    const conversationIds = new Set(conversations.map((item) => item.id));
    const messages = this.store.messages.filter((item) =>
      conversationIds.has(item.conversationId),
    );

    return {
      timestamp: new Date().toISOString(),
      totalMessagesIn: messages.filter((item) => item.direction === "IN").length,
      totalMessagesOut: messages.filter((item) => item.direction === "OUT").length,
      openConversations: conversations.filter((item) => item.status === "OPEN").length,
      connectedAgents: this.store.agents.filter((item) => targetIds.includes(item.id))
        .length,
      errorRate: 0.01,
    };
  }

  agentKpi(user: AuthUser, agentId: string) {
    assertAgentAccess(user, agentId);
    const conversations = this.store.conversations.filter(
      (item) => item.agentId === agentId,
    );
    const conversationIds = new Set(conversations.map((item) => item.id));
    const messages = this.store.messages.filter((item) =>
      conversationIds.has(item.conversationId),
    );
    return {
      agentId,
      firstResponseAvgSec: 60,
      messagesIn: messages.filter((item) => item.direction === "IN").length,
      messagesOut: messages.filter((item) => item.direction === "OUT").length,
      openConversations: conversations.filter((item) => item.status === "OPEN").length,
      connectionStatus:
        this.store.agents.find((item) => item.id === agentId)?.status ?? "DISCONNECTED",
    };
  }
}
