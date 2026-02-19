import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    accessToken: string;
    refreshToken: string;
    user: DefaultSession["user"] & {
      id: string;
      role: "ADMIN_TECH" | "SUPERVISOR" | "AGENT_OPERATIVE";
      agentScopes: string[];
      mfaVerified: boolean;
    };
  }

  interface User {
    role: "ADMIN_TECH" | "SUPERVISOR" | "AGENT_OPERATIVE";
    agentScopes: string[];
    mfaVerified: boolean;
    accessToken: string;
    refreshToken: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: "ADMIN_TECH" | "SUPERVISOR" | "AGENT_OPERATIVE";
    agentScopes?: string[];
    mfaVerified?: boolean;
    accessToken?: string;
    refreshToken?: string;
  }
}
