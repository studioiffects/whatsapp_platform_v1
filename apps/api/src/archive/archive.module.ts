import { Global, Module } from "@nestjs/common";
import { ConversationArchiveService } from "./conversation-archive.service";

@Global()
@Module({
  providers: [ConversationArchiveService],
  exports: [ConversationArchiveService],
})
export class ArchiveModule {}
