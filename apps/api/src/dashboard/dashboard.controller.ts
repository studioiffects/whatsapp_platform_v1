import { Controller, Get, Param, Query } from "@nestjs/common";
import { AppRole } from "../auth/roles.enum";
import { Authorized } from "../auth/decorators/authorized.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { AuthUser } from "../auth/interfaces/auth-user.interface";
import { DashboardService } from "./dashboard.service";

@Controller("dashboard")
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get("overview")
  @Authorized({
    roles: [AppRole.ADMIN_TECH, AppRole.SUPERVISOR, AppRole.AGENT_OPERATIVE],
    mfaRequired: false,
    agentScope: { source: "query", key: "agentId", optional: true },
  })
  overview(@CurrentUser() user: AuthUser, @Query("agentId") agentId?: string) {
    return this.service.overview(user, agentId);
  }

  @Get("agents/:id/kpi")
  @Authorized({
    roles: [AppRole.ADMIN_TECH, AppRole.SUPERVISOR, AppRole.AGENT_OPERATIVE],
    mfaRequired: false,
    agentScope: { source: "param", key: "id" },
  })
  agentKpi(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.service.agentKpi(user, id);
  }
}
