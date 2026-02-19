import { IsDateString, IsIn, IsObject, IsString } from "class-validator";

export class WhatsappWebhookDto {
  @IsIn(["message.received", "message.status.updated", "conversation.updated"])
  eventType!: "message.received" | "message.status.updated" | "conversation.updated";

  @IsString()
  agentExternalId!: string;

  @IsDateString()
  occurredAt!: string;

  @IsObject()
  payload!: Record<string, unknown>;
}
