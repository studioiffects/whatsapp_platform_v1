import { Controller, Get, Param } from "@nestjs/common";
import { Authorized } from "../decorators/authorized.decorator";
import { AppRole } from "../roles.enum";

@Controller("api/v1/dashboard")
export class DashboardControllerExample {
  @Get("overview")
  @Authorized({
    roles: [AppRole.ADMIN_TECH, AppRole.SUPERVISOR, AppRole.AGENT_OPERATIVE],
    agentScope: { source: "query", key: "agentId", optional: true },
  })
  getOverview() {
    return { ok: true };
  }

  @Get("agents/:id/kpi")
  @Authorized({
    roles: [AppRole.ADMIN_TECH, AppRole.SUPERVISOR, AppRole.AGENT_OPERATIVE],
    agentScope: { source: "param", key: "id" },
  })
  getAgentKpi(@Param("id") id: string) {
    return { id, ok: true };
  }
}
