import { Body, Controller, Get, Post } from "@nestjs/common";
import { AppRole } from "../auth/roles.enum";
import { Authorized } from "../auth/decorators/authorized.decorator";
import { AuthUser } from "../auth/interfaces/auth-user.interface";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { AIService } from "./ai.service";
import { AIChatDto } from "./dto/ai-chat.dto";
import { TestProviderDto } from "./dto/test-provider.dto";

@Controller("ai")
export class AIController {
  constructor(private readonly service: AIService) {}

  @Post("chat")
  @Authorized({
    roles: [AppRole.ADMIN_TECH, AppRole.SUPERVISOR, AppRole.AGENT_OPERATIVE],
    mfaRequired: false,
    agentScope: { source: "body", key: "agentScopeId", optional: true },
  })
  chat(@CurrentUser() user: AuthUser, @Body() body: AIChatDto) {
    return this.service.chat(user, body);
  }

  @Post("chat/stream")
  @Authorized({
    roles: [AppRole.ADMIN_TECH, AppRole.SUPERVISOR, AppRole.AGENT_OPERATIVE],
    mfaRequired: false,
    agentScope: { source: "body", key: "agentScopeId", optional: true },
  })
  chatStream(@CurrentUser() user: AuthUser, @Body() body: AIChatDto) {
    return this.service.stream(user, body);
  }

  @Get("providers")
  @Authorized({
    roles: [AppRole.ADMIN_TECH, AppRole.SUPERVISOR, AppRole.AGENT_OPERATIVE],
    mfaRequired: false,
  })
  providers() {
    return this.service.providersList();
  }

  @Post("providers/test")
  @Authorized({
    roles: [AppRole.ADMIN_TECH],
    mfaRequired: true,
  })
  testProvider(@Body() body: TestProviderDto) {
    return this.service.testProvider(body.provider, body.model);
  }
}
