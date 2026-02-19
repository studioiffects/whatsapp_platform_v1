import { Module } from "@nestjs/common";
import { StoreModule } from "../store/store.module";
import { WAAgentsController } from "./wa-agents.controller";
import { WAAgentsService } from "./wa-agents.service";

@Module({
  imports: [StoreModule],
  controllers: [WAAgentsController],
  providers: [WAAgentsService],
  exports: [WAAgentsService],
})
export class WAAgentsModule {}
