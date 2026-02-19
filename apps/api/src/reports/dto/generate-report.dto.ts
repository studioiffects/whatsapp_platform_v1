import { IsDateString, IsIn, IsOptional, IsUUID } from "class-validator";

export class GenerateReportDto {
  @IsIn(["AGENT_ACTIVITY", "CONVERSATIONS", "SLA", "AI_USAGE"])
  type!: "AGENT_ACTIVITY" | "CONVERSATIONS" | "SLA" | "AI_USAGE";

  @IsDateString()
  from!: string;

  @IsDateString()
  to!: string;

  @IsOptional()
  @IsUUID()
  agentId?: string;

  @IsOptional()
  @IsIn(["CSV", "PDF"])
  format?: "CSV" | "PDF";
}
