import { ForbiddenException, Injectable } from "@nestjs/common";
import { randomUUID } from "crypto";
import { AuthUser } from "../auth/interfaces/auth-user.interface";
import { AppRole } from "../auth/roles.enum";
import { assertAgentAccess } from "../common/utils/agent-scope.util";
import { AIChatDto } from "./dto/ai-chat.dto";

export interface ProviderInfo {
  name: string;
  enabled: boolean;
  defaultModel: string;
  health: "UP" | "DOWN" | "DEGRADED";
}

@Injectable()
export class AIService {
  private readonly providers: ProviderInfo[] = [
    { name: "openai", enabled: true, defaultModel: "gpt-4.1-mini", health: "UP" },
    { name: "gemini", enabled: true, defaultModel: "gemini-2.0-flash", health: "UP" },
    { name: "claude", enabled: true, defaultModel: "claude-3-5-sonnet", health: "UP" },
    { name: "grok", enabled: false, defaultModel: "grok-2", health: "DEGRADED" },
    { name: "ollama", enabled: true, defaultModel: "llama3.1:8b", health: "UP" },
    { name: "llama_cpp", enabled: true, defaultModel: "local-gguf", health: "UP" },
  ];

  chat(user: AuthUser, body: AIChatDto) {
    if (body.agentScopeId) {
      assertAgentAccess(user, body.agentScopeId);
    }

    if (user.role === AppRole.AGENT_OPERATIVE && body.useTools) {
      throw new ForbiddenException("Tool usage restricted for AGENT_OPERATIVE");
    }

    const sessionId = randomUUID();
    return {
      sessionId,
      provider: body.provider,
      model: body.model,
      output: `Respuesta simulada de ${body.provider} para: ${body.prompt.slice(0, 120)}`,
      usage: {
        inputTokens: Math.ceil(body.prompt.length / 4),
        outputTokens: 128,
        estimatedCost: 0.0021,
      },
    };
  }

  stream(user: AuthUser, body: AIChatDto) {
    return this.chat(user, body);
  }

  providersList() {
    return this.providers;
  }

  testProvider(provider: string, model: string) {
    return {
      taskId: randomUUID(),
      status: "QUEUED",
      provider,
      model,
    };
  }
}
