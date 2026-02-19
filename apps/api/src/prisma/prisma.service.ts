import { Injectable } from "@nestjs/common";

@Injectable()
export class PrismaService {
  async health() {
    return {
      ok: true,
      mode: "placeholder",
      message:
        "Replace PrismaService implementation with @prisma/client wiring when runtime project is initialized.",
    };
  }
}
