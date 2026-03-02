import { Controller, Get, Header } from "@nestjs/common";

@Controller()
export class HealthController {
  @Get("/health")
  @Header("Cache-Control", "no-store")
  health() {
    // Render/GitHub Actions kunnen dit als env zetten; lokaal is het leeg en dat is ok.
    return {
      ok: true,
      git_sha: process.env.GIT_SHA ?? null,
      render_service: process.env.RENDER_SERVICE_NAME ?? null,
    };
  }
}