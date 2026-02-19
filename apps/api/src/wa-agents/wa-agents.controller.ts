import { Body, Controller, Get, Param, Patch } from "@nestjs/common";
import { AppRole } from "../auth/roles.enum";
import { Authorized } from "../auth/decorators/authorized.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { AuthUser } from "../auth/interfaces/auth-user.interface";
import { UpdateAgentConfigDto } from "./dto/update-agent-config.dto";
import { WAAgentsService } from "./wa-agents.service";

@Controller("wa-agents")
export class WAAgentsController {
  constructor(private readonly service: WAAgentsService) {}

  @Get()
  @Authorized({
    roles: [AppRole.ADMIN_TECH, AppRole.SUPERVISOR, AppRole.AGENT_OPERATIVE],
    mfaRequired: false,
  })
  list(@CurrentUser() user: AuthUser) {
    return this.service.list(user);
  }

  @Get(":id")
  @Authorized({
    roles: [AppRole.ADMIN_TECH, AppRole.SUPERVISOR, AppRole.AGENT_OPERATIVE],
    mfaRequired: false,
    agentScope: { source: "param", key: "id" },
  })
  getById(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.service.getById(user, id);
  }

  @Patch(":id/config")
  @Authorized({
    roles: [AppRole.ADMIN_TECH],
    mfaRequired: true,
  })
  updateConfig(@Param("id") id: string, @Body() body: UpdateAgentConfigDto) {
    return this.service.updateConfig(id, body);
  }

  @Get(":id/health")
  @Authorized({
    roles: [AppRole.ADMIN_TECH, AppRole.SUPERVISOR, AppRole.AGENT_OPERATIVE],
    mfaRequired: false,
    agentScope: { source: "param", key: "id" },
  })
  health(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.service.health(user, id);
  }
}
