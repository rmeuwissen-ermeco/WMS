import { Controller, Get, Req } from "@nestjs/common";
import type { Request } from "express";

@Controller()
export class RoutesDebugController {
  @Get("/__routes")
  routes(@Req() req: Request) {
    const app: any = (req as any).app;
    const stack = app?._router?.stack;

    if (!Array.isArray(stack)) {
      return { ok: false, reason: "no express router stack on req.app" };
    }

    const routes = stack
      .filter((l: any) => l.route)
      .map((l: any) => ({
        path: l.route.path,
        methods: Object.keys(l.route.methods).filter((m) => l.route.methods[m]),
      }));

    return { ok: true, routes };
  }
}