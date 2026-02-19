import { Module } from "@nestjs/common";
import { StoreModule } from "../store/store.module";
import { BackupsController } from "./backups.controller";
import { BackupsService } from "./backups.service";

@Module({
  imports: [StoreModule],
  controllers: [BackupsController],
  providers: [BackupsService],
})
export class BackupsModule {}
