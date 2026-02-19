import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { AuthUser } from "./interfaces/auth-user.interface";
import { AppRole } from "./roles.enum";

interface JwtPayload {
  sub: string;
  email: string;
  role: AppRole;
  agentScopes: string[];
  mfaVerified: boolean;
  sessionId: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>("JWT_SECRET", "change_this_secret"),
    });
  }

  validate(payload: JwtPayload): AuthUser {
    if (!payload?.sub || !payload?.role) {
      throw new UnauthorizedException("Invalid access token");
    }

    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      agentScopes: payload.agentScopes ?? [],
      mfaVerified: payload.mfaVerified,
      sessionId: payload.sessionId,
    };
  }
}
