import { Module } from "@nestjs/common";
import { RealtimeModule } from "../realtime/realtime.module";
import { StoreModule } from "../store/store.module";
import { MessagesController } from "./messages.controller";
import { MessagesService } from "./messages.service";

@Module({
  imports: [StoreModule, RealtimeModule],
  controllers: [MessagesController],
  providers: [MessagesService],
  exports: [MessagesService],
})
export class MessagesModule {}
