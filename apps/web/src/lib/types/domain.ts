export interface WAAgent {
  id: string;
  code: string;
  displayName: string;
  phoneNumber: string;
  providerPhoneId: string;
  status: "DISCONNECTED" | "CONNECTING" | "CONNECTED" | "ERROR";
  createdAt?: string;
}

export interface Conversation {
  id: string;
  agentId: string;
  customerWaId: string;
  customerName?: string;
  status: "OPEN" | "CLOSED" | "PENDING";
  lastMessageAt?: string;
  createdAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  direction: "IN" | "OUT";
  messageType: "TEXT" | "IMAGE" | "VIDEO" | "DOC" | "AUDIO";
  textContent?: string;
  mediaUrl?: string;
  mimeType?: string;
  providerMessageId?: string;
  createdAt: string;
}

export interface DashboardOverview {
  timestamp: string;
  totalMessagesIn: number;
  totalMessagesOut: number;
  openConversations: number;
  connectedAgents: number;
  errorRate: number;
}

export interface AgentKpi {
  agentId: string;
  firstResponseAvgSec: number;
  messagesIn: number;
  messagesOut: number;
  openConversations: number;
  connectionStatus: string;
}

export interface BackupJob {
  id: string;
  backupType: "FULL" | "INCREMENTAL";
  status: "PENDING" | "RUNNING" | "DONE" | "FAILED";
  artifactPath?: string;
  checksum?: string;
  createdAt: string;
}

export interface ReportJob {
  reportId: string;
  status: "QUEUED" | "PROCESSING";
}

export interface AIResponse {
  sessionId: string;
  provider: string;
  model: string;
  output: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    estimatedCost: number;
  };
}

export interface MCPConnection {
  id: string;
  name: string;
  endpoint: string;
  enabled: boolean;
  createdAt: string;
}
