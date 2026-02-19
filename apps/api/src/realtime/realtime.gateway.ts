import { Injectable, Logger } from "@nestjs/common";

@Injectable()
export class RealtimeGateway {
  private readonly logger = new Logger(RealtimeGateway.name);

  emitConversationEvent(event: string, payload: unknown): void {
    this.logger.debug(`[realtime] ${event} ${JSON.stringify(payload)}`);
  }
}
