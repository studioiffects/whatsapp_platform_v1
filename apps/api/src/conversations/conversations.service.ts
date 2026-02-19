import { Injectable, NotFoundException } from "@nestjs/common";
import { AuthUser } from "../auth/interfaces/auth-user.interface";
import { AppRole } from "../auth/roles.enum";
import { assertAgentAccess } from "../common/utils/agent-scope.util";
import { InMemoryStore } from "../store/in-memory.store";
import { ListConversationsDto } from "./dto/list-conversations.dto";

@Injectable()
export class ConversationsService {
  constructor(private readonly store: InMemoryStore) {}

  list(user: AuthUser, filters: ListConversationsDto) {
    let items = [...this.store.conversations];

    if (filters.agentId) {
      assertAgentAccess(user, filters.agentId);
      items = items.filter((item) => item.agentId === filters.agentId);
    }

    if (filters.status) {
      items = items.filter((item) => item.status === filters.status);
    }

    if (filters.from) {
      items = items.filter(
        (item) =>
          new Date(item.createdAt).getTime() >= new Date(filters.from!).getTime(),
      );
    }

    if (filters.to) {
      items = items.filter(
        (item) => new Date(item.createdAt).getTime() <= new Date(filters.to!).getTime(),
      );
    }

    if (user.role === AppRole.AGENT_OPERATIVE) {
      items = items.filter((item) => user.agentScopes.includes(item.agentId));
    }

    return {
      items,
      total: items.length,
    };
  }

  messages(user: AuthUser, conversationId: string) {
    const conversation = this.store.conversations.find((item) => item.id === conversationId);
    if (!conversation) {
      throw new NotFoundException("Conversation not found");
    }
    assertAgentAccess(user, conversation.agentId);

    return this.store.messages.filter((item) => item.conversationId === conversationId);
  }
}
