import { Controller, Get } from "@nestjs/common";

@Controller()
export class RoutesDebugController {
  @Get("/__routes")
  routes() {
    // Express router stack
    const express = (global as any).__express_app;
    if (!express?._router?.stack) return { ok: false, reason: "no express router stack" };

    const routes = express._router.stack
      .filter((l: any) => l.route)
      .map((l: any) => ({
        path: l.route.path,
        methods: Object.keys(l.route.methods).filter((m) => l.route.methods[m]),
      }));

    return { ok: true, routes };
  }
}