import { IsBoolean, IsIn, IsNumber, IsOptional, IsString, IsUUID, Max, Min } from "class-validator";

export class AIChatDto {
  @IsIn(["openai", "gemini", "claude", "grok", "ollama", "llama_cpp"])
  provider!: "openai" | "gemini" | "claude" | "grok" | "ollama" | "llama_cpp";

  @IsString()
  model!: string;

  @IsString()
  prompt!: string;

  @IsOptional()
  @IsUUID()
  agentScopeId?: string;

  @IsOptional()
  @IsBoolean()
  useTools?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2)
  temperature?: number;
}
