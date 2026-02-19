import { IsIn, IsOptional, IsString } from "class-validator";

export class RunBackupDto {
  @IsIn(["FULL", "INCREMENTAL"])
  backupType!: "FULL" | "INCREMENTAL";

  @IsOptional()
  @IsString()
  reason?: string;
}
