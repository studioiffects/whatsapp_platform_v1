import { IsBoolean, IsInt, IsObject, IsOptional, IsString, Min } from "class-validator";

export class UpdateAgentConfigDto {
  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  rateLimitPerMinute?: number;

  @IsOptional()
  @IsBoolean()
  autoReplyEnabled?: boolean;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
