import { IsBoolean, IsIn, IsOptional, IsUUID } from "class-validator";

export class RestoreBackupDto {
  @IsUUID()
  backupId!: string;

  @IsIn(["STAGING", "PRODUCTION"])
  targetEnvironment!: "STAGING" | "PRODUCTION";

  @IsOptional()
  @IsBoolean()
  dryRun?: boolean;
}
