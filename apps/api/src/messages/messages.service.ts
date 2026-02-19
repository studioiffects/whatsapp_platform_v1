import { Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "crypto";
import { ConversationArchiveService } from "../archive/conversation-archive.service";
import { AuthUser } from "../auth/interfaces/auth-user.interface";
import { assertAgentAccess } from "../common/utils/agent-scope.util";
import { RealtimeGateway } from "../realtime/realtime.gateway";
import { InMemoryStore } from "../store/in-memory.store";
import { SendMediaBodyDto } from "./dto/send-media.dto";
import { SendTextDto } from "./dto/send-text.dto";

interface UploadedMediaFile {
  mimetype: string;
  originalname: string;
}

@Injectable()
export class MessagesService {
  constructor(
    private readonly store: InMemoryStore,
    private readonly realtime: RealtimeGateway,
    private readonly archive: ConversationArchiveService,
  ) {}

  sendText(user: AuthUser, body: SendTextDto) {
    assertAgentAccess(user, body.agentId);
    const conversation = this.store.conversations.find(
      (item) => item.id === body.conversationId && item.agentId === body.agentId,
    );
    if (!conversation) {
      throw new NotFoundException("Conversation not found for this agent");
    }

    const id = randomUUID();
    this.store.messages.push({
      id,
      conversationId: body.conversationId,
      direction: "OUT",
      messageType: "TEXT",
      textContent: body.text,
      createdAt: new Date().toISOString(),
      providerMessageId: `wamid.out.${id}`,
    });

    conversation.lastMessageAt = new Date().toISOString();
    this.archive.append({
      agentId: body.agentId,
      conversationId: body.conversationId,
      direction: "OUT",
      type: "TEXT",
      text: body.text,
      providerMessageId: `wamid.out.${id}`,
    });
    this.realtime.emitConversationEvent("message.sent.text", {
      id,
      conversationId: body.conversationId,
      agentId: body.agentId,
    });

    return { jobId: id, status: "QUEUED" };
  }

  sendMedia(user: AuthUser, body: SendMediaBodyDto, file?: UploadedMediaFile) {
    assertAgentAccess(user, body.agentId);
    const conversation = this.store.conversations.find(
      (item) => item.id === body.conversationId && item.agentId === body.agentId,
    );
    if (!conversation) {
      throw new NotFoundException("Conversation not found for this agent");
    }
    if (!file) {
      throw new NotFoundException("Media file is required");
    }

    const id = randomUUID();
    this.store.messages.push({
      id,
      conversationId: body.conversationId,
      direction: "OUT",
      messageType: this.resolveMediaType(file.mimetype),
      textContent: body.caption,
      mediaUrl: `/local-media/${id}-${file.originalname}`,
      mimeType: file.mimetype,
      createdAt: new Date().toISOString(),
      providerMessageId: `wamid.out.${id}`,
    });

    conversation.lastMessageAt = new Date().toISOString();
    this.archive.append({
      agentId: body.agentId,
      conversationId: body.conversationId,
      direction: "OUT",
      type: this.resolveMediaType(file.mimetype),
      text: body.caption,
      providerMessageId: `wamid.out.${id}`,
    });
    this.realtime.emitConversationEvent("message.sent.media", {
      id,
      conversationId: body.conversationId,
      agentId: body.agentId,
      mimeType: file.mimetype,
    });

    return { jobId: id, status: "QUEUED" };
  }

  private resolveMediaType(mimeType?: string): "IMAGE" | "VIDEO" | "DOC" | "AUDIO" {
    if (!mimeType) return "DOC";
    if (mimeType.startsWith("image/")) return "IMAGE";
    if (mimeType.startsWith("video/")) return "VIDEO";
    if (mimeType.startsWith("audio/")) return "AUDIO";
    return "DOC";
  }
}
