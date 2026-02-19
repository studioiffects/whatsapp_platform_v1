import { SetMetadata } from "@nestjs/common";
import { AGENT_SCOPE_KEY } from "../constants";

export type AgentScopeSource = "param" | "query" | "body";

export interface AgentScopeConfig {
  source: AgentScopeSource;
  key: string;
  optional?: boolean;
}

export const AgentScope = (config: AgentScopeConfig) =>
  SetMetadata(AGENT_SCOPE_KEY, config);
