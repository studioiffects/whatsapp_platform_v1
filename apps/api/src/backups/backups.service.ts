import { Injectable, NotFoundException } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { createHash, randomUUID } from "crypto";
import { InMemoryStore, StoreBackupJob } from "../store/in-memory.store";
import { RestoreBackupDto } from "./dto/restore-backup.dto";
import { RunBackupDto } from "./dto/run-backup.dto";

@Injectable()
export class BackupsService {
  constructor(private readonly store: InMemoryStore) {}

  run(body: RunBackupDto): StoreBackupJob {
    const now = new Date().toISOString();
    const id = randomUUID();
    const checksum = createHash("sha256").update(`${id}-${now}`).digest("hex");

    const job: StoreBackupJob = {
      id,
      backupType: body.backupType,
      status: "DONE",
      artifactPath: `backups/${body.backupType.toLowerCase()}/${id}.tar.gz.enc`,
      checksum,
      createdAt: now,
    };

    this.store.backupJobs.unshift(job);
    return job;
  }

  list(): StoreBackupJob[] {
    return this.store.backupJobs;
  }

  restore(body: RestoreBackupDto) {
    const backup = this.store.backupJobs.find((item) => item.id === body.backupId);
    if (!backup) {
      throw new NotFoundException("Backup not found");
    }

    return {
      taskId: randomUUID(),
      status: "QUEUED",
      restore: {
        backupId: backup.id,
        targetEnvironment: body.targetEnvironment,
        dryRun: body.dryRun ?? true,
      },
    };
  }

  @Cron("*/15 * * * *")
  runIncrementalSchedule(): void {
    this.run({ backupType: "INCREMENTAL", reason: "scheduled" });
  }
}
