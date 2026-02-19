import { Injectable, UnauthorizedException } from "@nestjs/common";
import { randomUUID } from "crypto";
import { ConversationArchiveService } from "../archive/conversation-archive.service";
import { RealtimeGateway } from "../realtime/realtime.gateway";
import { InMemoryStore } from "../store/in-memory.store";
import { WhatsappWebhookDto } from "./dto/whatsapp-webhook.dto";

@Injectable()
export class WebhooksService {
  constructor(
    private readonly store: InMemoryStore,
    private readonly realtime: RealtimeGateway,
    private readonly archive: ConversationArchiveService,
  ) {}

  receiveWhatsapp(
    signature: string | undefined,
    timestamp: string | undefined,
    body: WhatsappWebhookDto,
  ) {
    if (!signature || !timestamp) {
      throw new UnauthorizedException("Missing provider signature headers");
    }

    if (body.eventType === "message.received") {
      const agent = this.store.agents.find(
        (item) => item.providerPhoneId === body.agentExternalId,
      );
      if (agent) {
        let conversation = this.store.conversations.find(
          (item) =>
            item.agentId === agent.id &&
            item.customerWaId === String(body.payload.customerWaId ?? ""),
        );
        if (!conversation) {
          conversation = {
            id: randomUUID(),
            agentId: agent.id,
            customerWaId: String(body.payload.customerWaId ?? "unknown"),
            customerName:
              typeof body.payload.customerName === "string"
                ? body.payload.customerName
                : undefined,
            status: "OPEN",
            createdAt: new Date().toISOString(),
            lastMessageAt: body.occurredAt,
          };
          this.store.conversations.unshift(conversation);
        }

        this.store.messages.unshift({
          id: randomUUID(),
          conversationId: conversation.id,
          direction: "IN",
          messageType: "TEXT",
          textContent:
            typeof body.payload.text === "string"
              ? body.payload.text
              : "[non-text message]",
          providerMessageId:
            typeof body.payload.providerMessageId === "string"
              ? body.payload.providerMessageId
              : undefined,
          createdAt: body.occurredAt,
        });

        this.archive.append({
          agentId: agent.id,
          conversationId: conversation.id,
          direction: "IN",
          type: "TEXT",
          text:
            typeof body.payload.text === "string"
              ? body.payload.text
              : "[non-text message]",
          providerMessageId:
            typeof body.payload.providerMessageId === "string"
              ? body.payload.providerMessageId
              : undefined,
        });

        this.realtime.emitConversationEvent("webhook.message.received", {
          agentId: agent.id,
          conversationId: conversation.id,
        });
      }
    }

    return { ok: true };
  }
}
