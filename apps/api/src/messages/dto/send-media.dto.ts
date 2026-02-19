import { IsOptional, IsString, IsUUID, MaxLength } from "class-validator";

export class SendMediaBodyDto {
  @IsUUID()
  conversationId!: string;

  @IsUUID()
  agentId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  caption?: string;
}
