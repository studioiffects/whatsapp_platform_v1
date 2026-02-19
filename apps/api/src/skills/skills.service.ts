import { Injectable } from "@nestjs/common";
import { randomInt } from "crypto";
import { AuthUser } from "../auth/interfaces/auth-user.interface";
import { assertAgentAccess } from "../common/utils/agent-scope.util";
import { ExecuteSkillDto } from "./dto/execute-skill.dto";

@Injectable()
export class SkillsService {
  execute(user: AuthUser, body: ExecuteSkillDto) {
    if (body.agentScopeId) {
      assertAgentAccess(user, body.agentScopeId);
    }

    return {
      skillId: body.skillId,
      output: {
        ok: true,
        echo: body.input,
      },
      auditId: randomInt(100000, 999999),
    };
  }
}
