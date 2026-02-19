import { apiFetchAuth } from "./base";
import {
  AgentKpi,
  AIResponse,
  BackupJob,
  Conversation,
  DashboardOverview,
  MCPConnection,
  Message,
  ReportJob,
  WAAgent,
} from "../types/domain";

interface ConversationListResponse {
  items: Conversation[];
  total: number;
}

interface QueueAck {
  jobId: string;
  status: "QUEUED" | "PROCESSING";
}

export class ApiClient {
  constructor(private readonly accessToken: string) {}

  listAgents() {
    return apiFetchAuth<WAAgent[]>("/wa-agents", this.accessToken, {
      method: "GET",
    });
  }

  agentHealth(id: string) {
    return apiFetchAuth<{ connected: boolean; latencyMs: number; lastSyncAt: string }>(
      `/wa-agents/${id}/health`,
      this.accessToken,
      { method: "GET" },
    );
  }

  listConversations(agentId?: string) {
    const query = agentId ? `?agentId=${encodeURIComponent(agentId)}` : "";
    return apiFetchAuth<ConversationListResponse>(
      `/conversations${query}`,
      this.accessToken,
      { method: "GET" },
    );
  }

  listMessages(conversationId: string) {
    return apiFetchAuth<Message[]>(
      `/conversations/${conversationId}/messages`,
      this.accessToken,
      { method: "GET" },
    );
  }

  sendText(input: { agentId: string; conversationId: string; text: string }) {
    return apiFetchAuth<QueueAck>("/messages/send-text", this.accessToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  }

  async sendMedia(input: {
    agentId: string;
    conversationId: string;
    caption?: string;
    file: File;
  }) {
    const formData = new FormData();
    formData.set("agentId", input.agentId);
    formData.set("conversationId", input.conversationId);
    if (input.caption) formData.set("caption", input.caption);
    formData.set("media", input.file);

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001/api/v1"}/messages/send-media`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
        body: formData,
        cache: "no-store",
      },
    );

    if (!response.ok) {
      const details = await response.text();
      throw new Error(`Media send failed: ${response.status} ${details}`);
    }
    return (await response.json()) as QueueAck;
  }

  dashboardOverview(agentId?: string) {
    const query = agentId ? `?agentId=${encodeURIComponent(agentId)}` : "";
    return apiFetchAuth<DashboardOverview>(
      `/dashboard/overview${query}`,
      this.accessToken,
      { method: "GET" },
    );
  }

  agentKpi(id: string) {
    return apiFetchAuth<AgentKpi>(`/dashboard/agents/${id}/kpi`, this.accessToken, {
      method: "GET",
    });
  }

  generateReport(input: {
    type: "AGENT_ACTIVITY" | "CONVERSATIONS" | "SLA" | "AI_USAGE";
    from: string;
    to: string;
    agentId?: string;
    format?: "CSV" | "PDF";
  }) {
    return apiFetchAuth<ReportJob>("/reports/generate", this.accessToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  }

  downloadReport(reportId: string) {
    return apiFetchAuth<{ id: string; filename: string; status: string }>(
      `/reports/${reportId}/download`,
      this.accessToken,
      { method: "GET" },
    );
  }

  runBackup(backupType: "FULL" | "INCREMENTAL", reason?: string) {
    return apiFetchAuth<BackupJob>("/backups/run", this.accessToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ backupType, reason }),
    });
  }

  listBackups() {
    return apiFetchAuth<BackupJob[]>("/backups", this.accessToken, {
      method: "GET",
    });
  }

  restoreBackup(backupId: string, targetEnvironment: "STAGING" | "PRODUCTION") {
    return apiFetchAuth<{ taskId: string; status: string }>("/backups/restore", this.accessToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ backupId, targetEnvironment, dryRun: true }),
    });
  }

  aiChat(input: {
    provider: "openai" | "gemini" | "claude" | "grok" | "ollama" | "llama_cpp";
    model: string;
    prompt: string;
    agentScopeId?: string;
    useTools?: boolean;
    temperature?: number;
  }) {
    return apiFetchAuth<AIResponse>("/ai/chat", this.accessToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  }

  listAiProviders() {
    return apiFetchAuth<
      Array<{ name: string; enabled: boolean; defaultModel: string; health: string }>
    >("/ai/providers", this.accessToken, {
      method: "GET",
    });
  }

  listMcpConnections() {
    return apiFetchAuth<MCPConnection[]>("/mcp/connections", this.accessToken, {
      method: "GET",
    });
  }

  createMcpConnection(input: {
    name: string;
    endpoint: string;
    authType?: "NONE" | "API_KEY" | "OAUTH";
    enabled?: boolean;
  }) {
    return apiFetchAuth<MCPConnection>("/mcp/connections", this.accessToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  }

  executeSkill(input: { skillId: string; input: Record<string, unknown>; agentScopeId?: string }) {
    return apiFetchAuth<{ skillId: string; output: Record<string, unknown>; auditId: number }>(
      "/skills/execute",
      this.accessToken,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      },
    );
  }
}
