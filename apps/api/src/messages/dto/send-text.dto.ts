import { IsString, IsUUID, MaxLength, MinLength } from "class-validator";

export class SendTextDto {
  @IsUUID()
  agentId!: string;

  @IsUUID()
  conversationId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(4096)
  text!: string;
}
