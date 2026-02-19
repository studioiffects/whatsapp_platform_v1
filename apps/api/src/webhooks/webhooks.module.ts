import { Module } from "@nestjs/common";
import { RealtimeModule } from "../realtime/realtime.module";
import { StoreModule } from "../store/store.module";
import { WebhooksController } from "./webhooks.controller";
import { WebhooksService } from "./webhooks.service";

@Module({
  imports: [StoreModule, RealtimeModule],
  controllers: [WebhooksController],
  providers: [WebhooksService],
})
export class WebhooksModule {}
