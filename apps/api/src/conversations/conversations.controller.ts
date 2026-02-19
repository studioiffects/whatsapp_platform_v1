import { Controller, Get, Param, Query } from "@nestjs/common";
import { AppRole } from "../auth/roles.enum";
import { Authorized } from "../auth/decorators/authorized.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { AuthUser } from "../auth/interfaces/auth-user.interface";
import { ListConversationsDto } from "./dto/list-conversations.dto";
import { ConversationsService } from "./conversations.service";

@Controller("conversations")
export class ConversationsController {
  constructor(private readonly service: ConversationsService) {}

  @Get()
  @Authorized({
    roles: [AppRole.ADMIN_TECH, AppRole.SUPERVISOR, AppRole.AGENT_OPERATIVE],
    mfaRequired: false,
    agentScope: { source: "query", key: "agentId", optional: true },
  })
  list(@CurrentUser() user: AuthUser, @Query() filters: ListConversationsDto) {
    return this.service.list(user, filters);
  }

  @Get(":id/messages")
  @Authorized({
    roles: [AppRole.ADMIN_TECH, AppRole.SUPERVISOR, AppRole.AGENT_OPERATIVE],
    mfaRequired: false,
  })
  listMessages(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.service.messages(user, id);
  }
}
