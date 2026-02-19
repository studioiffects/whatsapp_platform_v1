import {
  Body,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { AppRole } from "../auth/roles.enum";
import { Authorized } from "../auth/decorators/authorized.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { AuthUser } from "../auth/interfaces/auth-user.interface";
import { SendMediaBodyDto } from "./dto/send-media.dto";
import { SendTextDto } from "./dto/send-text.dto";
import { MessagesService } from "./messages.service";

interface UploadedMediaFile {
  mimetype: string;
  originalname: string;
}

@Controller("messages")
export class MessagesController {
  constructor(private readonly service: MessagesService) {}

  @Post("send-text")
  @Authorized({
    roles: [AppRole.ADMIN_TECH, AppRole.SUPERVISOR, AppRole.AGENT_OPERATIVE],
    mfaRequired: false,
    agentScope: { source: "body", key: "agentId" },
  })
  sendText(@CurrentUser() user: AuthUser, @Body() body: SendTextDto) {
    return this.service.sendText(user, body);
  }

  @Post("send-media")
  @UseInterceptors(FileInterceptor("media"))
  @Authorized({
    roles: [AppRole.ADMIN_TECH, AppRole.SUPERVISOR, AppRole.AGENT_OPERATIVE],
    mfaRequired: false,
    agentScope: { source: "body", key: "agentId" },
  })
  sendMedia(
    @CurrentUser() user: AuthUser,
    @Body() body: SendMediaBodyDto,
    @UploadedFile() media?: UploadedMediaFile,
  ) {
    return this.service.sendMedia(user, body, media);
  }
}
