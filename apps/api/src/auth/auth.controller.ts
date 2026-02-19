import { Body, Controller, Get, HttpCode, HttpStatus, Post } from "@nestjs/common";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { AuthUser } from "./interfaces/auth-user.interface";
import { LoginDto } from "./dto/login.dto";
import { Verify2FADto } from "./dto/verify-2fa.dto";
import { AuthService } from "./auth.service";
import { Authorized } from "./decorators/authorized.decorator";
import { AppRole } from "./roles.enum";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("login")
  login(@Body() body: LoginDto) {
    return this.authService.login(body.email, body.password);
  }

  @Post("2fa/verify")
  verify2fa(@Body() body: Verify2FADto) {
    return this.authService.verify2fa(body.challengeToken, body.code);
  }

  @Post("logout")
  @HttpCode(HttpStatus.NO_CONTENT)
  @Authorized({
    roles: [AppRole.ADMIN_TECH, AppRole.SUPERVISOR, AppRole.AGENT_OPERATIVE],
    mfaRequired: false,
  })
  logout(): void {
    return;
  }

  @Get("me")
  @Authorized({
    roles: [AppRole.ADMIN_TECH, AppRole.SUPERVISOR, AppRole.AGENT_OPERATIVE],
    mfaRequired: false,
  })
  me(@CurrentUser() user: AuthUser) {
    return this.authService.me(user);
  }
}
