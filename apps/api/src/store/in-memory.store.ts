import { Injectable } from "@nestjs/common";
import { AppRole } from "../auth/roles.enum";

export interface StoreUser {
  id: string;
  email: string;
  password: string;
  role: AppRole;
  mfaEnabled: boolean;
  agentScopes: string[];
}

export interface StoreAgent {
  id: string;
  code: string;
  displayName: string;
  phoneNumber: string;
  providerPhoneId: string;
  status: "DISCONNECTED" | "CONNECTING" | "CONNECTED" | "ERROR";
}

export interface StoreConversation {
  id: string;
  agentId: string;
  customerWaId: string;
  customerName?: string;
  status: "OPEN" | "CLOSED" | "PENDING";
  lastMessageAt?: string;
  createdAt: string;
}

export interface StoreMessage {
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

export interface StoreBackupJob {
  id: string;
  backupType: "FULL" | "INCREMENTAL";
  status: "PENDING" | "RUNNING" | "DONE" | "FAILED";
  artifactPath?: string;
  checksum?: string;
  createdAt: string;
}

export interface StoreReport {
  id: string;
  type: "AGENT_ACTIVITY" | "CONVERSATIONS" | "SLA" | "AI_USAGE";
  status: "QUEUED" | "PROCESSING" | "DONE";
  format: "CSV" | "PDF";
  createdAt: string;
}

export interface StoreMcpConnection {
  id: string;
  name: string;
  endpoint: string;
  enabled: boolean;
  createdAt: string;
}

@Injectable()
export class InMemoryStore {
  readonly users: StoreUser[] = [
    {
      id: "00000000-0000-0000-0000-000000000001",
      email: "admin@platform.local",
      password: "ChangeMe123!",
      role: AppRole.ADMIN_TECH,
      mfaEnabled: true,
      agentScopes: [],
    },
    {
      id: "00000000-0000-0000-0000-000000000002",
      email: "supervisor@platform.local",
      password: "ChangeMe123!",
      role: AppRole.SUPERVISOR,
      mfaEnabled: true,
      agentScopes: [],
    },
    {
      id: "00000000-0000-0000-0000-000000000003",
      email: "agente01@platform.local",
      password: "ChangeMe123!",
      role: AppRole.AGENT_OPERATIVE,
      mfaEnabled: false,
      agentScopes: ["10000000-0000-0000-0000-000000000001"],
    },
  ];

  readonly agents: StoreAgent[] = Array.from({ length: 10 }, (_, index) => {
    const id = String(index + 1).padStart(2, "0");
    return {
      id: `10000000-0000-0000-0000-0000000000${id}`,
      code: `agent-${id}`,
      displayName: `Agente ${id}`,
      phoneNumber: `+519990000${id}`,
      providerPhoneId: `provider-phone-${id}`,
      status: "CONNECTED",
    } as StoreAgent;
  });

  readonly conversations: StoreConversation[] = [
    {
      id: "20000000-0000-0000-0000-000000000001",
      agentId: "10000000-0000-0000-0000-000000000001",
      customerWaId: "51911111111",
      customerName: "Cliente Demo",
      status: "OPEN",
      lastMessageAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    },
  ];

  readonly messages: StoreMessage[] = [
    {
      id: "30000000-0000-0000-0000-000000000001",
      conversationId: "20000000-0000-0000-0000-000000000001",
      direction: "IN",
      messageType: "TEXT",
      textContent: "Hola, necesito informacion",
      createdAt: new Date().toISOString(),
      providerMessageId: "wamid.inbound.demo.1",
    },
  ];

  readonly backupJobs: StoreBackupJob[] = [];
  readonly reports: StoreReport[] = [];
  readonly mcpConnections: StoreMcpConnection[] = [];
}
