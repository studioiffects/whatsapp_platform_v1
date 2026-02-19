import { Injectable, Logger } from "@nestjs/common";
import { appendFileSync, mkdirSync } from "fs";
import { join } from "path";

interface ArchiveMessageInput {
  agentId: string;
  conversationId: string;
  direction: "IN" | "OUT";
  type: "TEXT" | "IMAGE" | "VIDEO" | "DOC" | "AUDIO";
  text?: string;
  providerMessageId?: string;
}

@Injectable()
export class ConversationArchiveService {
  private readonly logger = new Logger(ConversationArchiveService.name);

  append(input: ArchiveMessageInput): void {
    const now = new Date();
    const date = now.toISOString().slice(0, 10);
    const line = JSON.stringify({
      ts: now.toISOString(),
      agentId: input.agentId,
      conversationId: input.conversationId,
      direction: input.direction,
      type: input.type,
      text: input.text,
      providerMessageId: input.providerMessageId,
    });

    const folder = join(process.cwd(), "storage", "conversations", input.agentId);
    const file = join(folder, `${date}.jsonl`);
    mkdirSync(folder, { recursive: true });
    appendFileSync(file, `${line}\n`, { encoding: "utf-8" });

    this.logger.debug(`Archived message to ${file}`);
  }
}
