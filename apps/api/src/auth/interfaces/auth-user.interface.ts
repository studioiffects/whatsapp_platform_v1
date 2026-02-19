import { AppRole } from "../roles.enum";

export interface AuthUser {
  id: string;
  role: AppRole;
  agentScopes: string[];
  mfaVerified: boolean;
  sessionId?: string;
  email?: string;
}
