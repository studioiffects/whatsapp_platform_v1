import { Body, Controller, Get, Post } from "@nestjs/common";
import { AppRole } from "../auth/roles.enum";
import { Authorized } from "../auth/decorators/authorized.decorator";
import { CreateMcpConnectionDto } from "./dto/create-mcp-connection.dto";
import { McpService } from "./mcp.service";

@Controller("mcp/connections")
export class McpController {
  constructor(private readonly service: McpService) {}

  @Get()
  @Authorized({
    roles: [AppRole.ADMIN_TECH, AppRole.SUPERVISOR],
    mfaRequired: true,
  })
  list() {
    return this.service.list();
  }

  @Post()
  @Authorized({
    roles: [AppRole.ADMIN_TECH],
    mfaRequired: true,
  })
  create(@Body() body: CreateMcpConnectionDto) {
    return this.service.create(body);
  }
}
