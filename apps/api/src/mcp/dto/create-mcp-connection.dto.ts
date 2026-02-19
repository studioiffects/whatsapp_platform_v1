import { IsBoolean, IsIn, IsObject, IsOptional, IsString } from "class-validator";

export class CreateMcpConnectionDto {
  @IsString()
  name!: string;

  @IsString()
  endpoint!: string;

  @IsOptional()
  @IsIn(["NONE", "API_KEY", "OAUTH"])
  authType?: "NONE" | "API_KEY" | "OAUTH";

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
