import { Body, Controller, Get, Post } from "@nestjs/common";
import { AppRole } from "../auth/roles.enum";
import { Authorized } from "../auth/decorators/authorized.decorator";
import { BackupsService } from "./backups.service";
import { RestoreBackupDto } from "./dto/restore-backup.dto";
import { RunBackupDto } from "./dto/run-backup.dto";

@Controller("backups")
export class BackupsController {
  constructor(private readonly service: BackupsService) {}

  @Post("run")
  @Authorized({
    roles: [AppRole.ADMIN_TECH, AppRole.SUPERVISOR],
    mfaRequired: true,
  })
  run(@Body() body: RunBackupDto) {
    return this.service.run(body);
  }

  @Get()
  @Authorized({
    roles: [AppRole.ADMIN_TECH, AppRole.SUPERVISOR],
    mfaRequired: true,
  })
  list() {
    return this.service.list();
  }

  @Post("restore")
  @Authorized({
    roles: [AppRole.ADMIN_TECH],
    mfaRequired: true,
  })
  restore(@Body() body: RestoreBackupDto) {
    return this.service.restore(body);
  }
}
