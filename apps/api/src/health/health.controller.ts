import { Controller, Get } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Controller("health")
export class HealthController {
  constructor(private readonly prismaService: PrismaService) {}

  @Get()
  async health() {
    const db = await this.prismaService.health();
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
      db,
    };
  }
}
