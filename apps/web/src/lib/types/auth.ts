export type AppRole = "ADMIN_TECH" | "SUPERVISOR" | "AGENT_OPERATIVE";

export interface MeResponse {
  id: string;
  email: string;
  role: AppRole;
  agentScopes: string[];
  mfaVerified: boolean;
}

export interface LoginResponse {
  requires2fa: boolean;
  challengeToken: string | null;
  accessToken: string | null;
  refreshToken: string | null;
}

export interface Verify2FAResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}
