import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { MFA_REQUIRED_KEY } from "../constants";
import { AuthUser } from "../interfaces/auth-user.interface";
import { AppRole } from "../roles.enum";

@Injectable()
export class MfaGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const routeMfaRequired =
      this.reflector.getAllAndOverride<boolean>(MFA_REQUIRED_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? false;

    const request = context.switchToHttp().getRequest<{ user?: AuthUser }>();
    const user = request.user;
    if (!user) {
      if (routeMfaRequired) {
        throw new ForbiddenException("Missing authenticated user");
      }
      return true;
    }

    const roleRequiresMfa =
      user.role === AppRole.ADMIN_TECH || user.role === AppRole.SUPERVISOR;
    const mustVerifyMfa = routeMfaRequired || roleRequiresMfa;

    if (mustVerifyMfa && !user.mfaVerified) {
      throw new ForbiddenException("MFA verification required");
    }

    return true;
  }
}
