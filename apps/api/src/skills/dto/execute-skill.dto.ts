import { IsObject, IsOptional, IsString, IsUUID } from "class-validator";

export class ExecuteSkillDto {
  @IsString()
  skillId!: string;

  @IsObject()
  input!: Record<string, unknown>;

  @IsOptional()
  @IsUUID()
  agentScopeId?: string;
}
