import { Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "crypto";
import { InMemoryStore } from "../store/in-memory.store";
import { GenerateReportDto } from "./dto/generate-report.dto";

@Injectable()
export class ReportsService {
  constructor(private readonly store: InMemoryStore) {}

  generate(body: GenerateReportDto) {
    const id = randomUUID();
    this.store.reports.push({
      id,
      type: body.type,
      status: "QUEUED",
      format: body.format ?? "CSV",
      createdAt: new Date().toISOString(),
    });
    return {
      reportId: id,
      status: "QUEUED",
    };
  }

  download(id: string) {
    const report = this.store.reports.find((item) => item.id === id);
    if (!report) {
      throw new NotFoundException("Report not found");
    }

    return {
      id: report.id,
      filename: `report-${report.id}.${report.format.toLowerCase()}`,
      status: report.status,
    };
  }
}
