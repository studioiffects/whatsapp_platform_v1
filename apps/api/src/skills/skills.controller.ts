import { Body, Controller, Post } from "@nestjs/common";
import { AppRole } from "../auth/roles.enum";
import { Authorized } from "../auth/decorators/authorized.decorator";
import { AuthUser } from "../auth/interfaces/auth-user.interface";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { ExecuteSkillDto } from "./dto/execute-skill.dto";
import { SkillsService } from "./skills.service";

@Controller("skills")
export class SkillsController {
  constructor(private readonly service: SkillsService) {}

  @Post("execute")
  @Authorized({
    roles: [AppRole.ADMIN_TECH, AppRole.SUPERVISOR, AppRole.AGENT_OPERATIVE],
    mfaRequired: false,
    agentScope: { source: "body", key: "agentScopeId", optional: true },
  })
  execute(@CurrentUser() user: AuthUser, @Body() body: ExecuteSkillDto) {
    return this.service.execute(user, body);
  }
}
