import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { AppRole } from "../auth/roles.enum";
import { Authorized } from "../auth/decorators/authorized.decorator";
import { GenerateReportDto } from "./dto/generate-report.dto";
import { ReportsService } from "./reports.service";

@Controller("reports")
export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  @Post("generate")
  @Authorized({
    roles: [AppRole.ADMIN_TECH, AppRole.SUPERVISOR],
    mfaRequired: true,
  })
  generate(@Body() body: GenerateReportDto) {
    return this.service.generate(body);
  }

  @Get(":id/download")
  @Authorized({
    roles: [AppRole.ADMIN_TECH, AppRole.SUPERVISOR],
    mfaRequired: true,
  })
  download(@Param("id") id: string) {
    return this.service.download(id);
  }
}
