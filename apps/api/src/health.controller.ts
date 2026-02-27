import { Controller, Get } from "@nestjs/common";
import { PrismaService } from "./prisma/prisma.service";

@Controller()
export class HealthController {
  constructor(private prisma: PrismaService) {}

  @Get("/health")
  async health() {
    const count = await this.prisma.user.count();
    return { ok: true, users: count };
  }
}