import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { meRequest } from "../api/auth-api";
import { AppRole } from "../types/auth";

const credentialsSchema = z.object({
  mode: z.literal("token"),
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    Credentials({
      id: "credentials",
      name: "Credentials",
      credentials: {
        mode: { label: "Mode", type: "text" },
        accessToken: { label: "Access token", type: "text" },
        refreshToken: { label: "Refresh token", type: "text" },
      },
      async authorize(rawCredentials) {
        const parsed = credentialsSchema.safeParse(rawCredentials);
        if (!parsed.success) {
          return null;
        }

        const { accessToken, refreshToken } = parsed.data;
        try {
          const me = await meRequest(accessToken);
          return {
            id: me.id,
            email: me.email,
            role: me.role,
            agentScopes: me.agentScopes,
            mfaVerified: me.mfaVerified,
            accessToken,
            refreshToken,
          };
        } catch {
          return null;
        }
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.email = user.email;
        token.role = (user.role as AppRole) ?? "AGENT_OPERATIVE";
        token.agentScopes = (user.agentScopes as string[]) ?? [];
        token.mfaVerified = Boolean(user.mfaVerified);
        token.accessToken = user.accessToken as string;
        token.refreshToken = user.refreshToken as string;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.email = token.email ?? "";
        session.user.role = (token.role as AppRole) ?? "AGENT_OPERATIVE";
        session.user.agentScopes = (token.agentScopes as string[]) ?? [];
        session.user.mfaVerified = Boolean(token.mfaVerified);
      }
      session.accessToken = (token.accessToken as string) ?? "";
      session.refreshToken = (token.refreshToken as string) ?? "";
      return session;
    },
  },
});
