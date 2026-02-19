import { Body, Controller, Headers, Post } from "@nestjs/common";
import { WhatsappWebhookDto } from "./dto/whatsapp-webhook.dto";
import { WebhooksService } from "./webhooks.service";

@Controller("webhooks")
export class WebhooksController {
  constructor(private readonly service: WebhooksService) {}

  @Post("whatsapp")
  receiveWhatsapp(
    @Headers("x-provider-signature") signature: string | undefined,
    @Headers("x-provider-timestamp") timestamp: string | undefined,
    @Body() body: WhatsappWebhookDto,
  ) {
    return this.service.receiveWhatsapp(signature, timestamp, body);
  }
}
