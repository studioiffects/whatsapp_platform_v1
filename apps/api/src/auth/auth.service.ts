import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { randomUUID } from "crypto";
import { InMemoryStore, StoreUser } from "../store/in-memory.store";
import { AuthUser } from "./interfaces/auth-user.interface";

export interface LoginResult {
  requires2fa: boolean;
  challengeToken: string | null;
  accessToken: string | null;
  refreshToken: string | null;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

@Injectable()
export class AuthService {
  private readonly challengeMap = new Map<string, string>();

  constructor(
    private readonly store: InMemoryStore,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  login(email: string, password: string): LoginResult {
    const user = this.findUser(email, password);
    if (!user) {
      throw new UnauthorizedException("Invalid credentials");
    }

    if (user.mfaEnabled) {
      const challengeToken = randomUUID();
      this.challengeMap.set(challengeToken, user.id);
      return {
        requires2fa: true,
        challengeToken,
        accessToken: null,
        refreshToken: null,
      };
    }

    const tokens = this.issueTokens(user, false);
    return {
      requires2fa: false,
      challengeToken: null,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  verify2fa(challengeToken: string, code: string): TokenPair {
    const userId = this.challengeMap.get(challengeToken);
    if (!userId || code.trim().length < 6) {
      throw new UnauthorizedException("Invalid 2FA challenge");
    }

    const user = this.store.users.find((item) => item.id === userId);
    if (!user) {
      throw new UnauthorizedException("Invalid 2FA challenge");
    }

    this.challengeMap.delete(challengeToken);
    return this.issueTokens(user, true);
  }

  me(user: AuthUser): AuthUser {
    return user;
  }

  private findUser(email: string, password: string): StoreUser | undefined {
    return this.store.users.find(
      (user) => user.email === email && user.password === password,
    );
  }

  private issueTokens(user: StoreUser, mfaVerified: boolean): TokenPair {
    const sessionId = randomUUID();
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      agentScopes: user.agentScopes,
      mfaVerified,
      sessionId,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>("JWT_EXPIRES_IN", "900s"),
    });
    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>("JWT_REFRESH_EXPIRES_IN", "7d"),
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 900,
    };
  }
}
