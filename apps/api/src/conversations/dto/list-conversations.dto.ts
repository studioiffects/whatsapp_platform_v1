import { IsDateString, IsIn, IsOptional, IsUUID } from "class-validator";

export class ListConversationsDto {
  @IsOptional()
  @IsUUID()
  agentId?: string;

  @IsOptional()
  @IsIn(["OPEN", "CLOSED", "PENDING"])
  status?: "OPEN" | "CLOSED" | "PENDING";

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
