import { Module } from "@nestjs/common";
import { StoreModule } from "../store/store.module";
import { DashboardController } from "./dashboard.controller";
import { DashboardService } from "./dashboard.service";

@Module({
  imports: [StoreModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
