import { Controller, Get } from "@nestjs/common";
import { DiscoveryService, Reflector } from "@nestjs/core";
import { PATH_METADATA, METHOD_METADATA } from "@nestjs/common/constants";
import { RequestMethod } from "@nestjs/common";

function methodName(m: RequestMethod) {
  switch (m) {
    case RequestMethod.GET:
      return "GET";
    case RequestMethod.POST:
      return "POST";
    case RequestMethod.PUT:
      return "PUT";
    case RequestMethod.PATCH:
      return "PATCH";
    case RequestMethod.DELETE:
      return "DELETE";
    case RequestMethod.OPTIONS:
      return "OPTIONS";
    case RequestMethod.HEAD:
      return "HEAD";
    default:
      return String(m);
  }
}

@Controller()
export class RoutesDebugController {
  constructor(private readonly discovery: DiscoveryService, private readonly reflector: Reflector) {}

  @Get("/__routes")
  routes() {
    const controllers = this.discovery.getControllers();

    const out: Array<{ controller: string; method: string; path: string }> = [];

    for (const c of controllers) {
      if (!c.instance) continue;
      if (!c.metatype) continue;

      const ctrlPath =
        this.reflector.getAllAndOverride<string | string[]>(PATH_METADATA, [c.metatype]) ?? "";

      const proto = Object.getPrototypeOf(c.instance);
      const methodNames = Object.getOwnPropertyNames(proto).filter((n) => n !== "constructor");

      for (const name of methodNames) {
        const handler = proto[name];

        const routePath =
          this.reflector.getAllAndOverride<string | string[]>(PATH_METADATA, [handler]) ?? "";

        const routeMethod = this.reflector.getAllAndOverride<RequestMethod>(
          METHOD_METADATA,
          [handler]
        );

        if (!routePath || routeMethod === undefined) continue;

        const ctrlPrefix = Array.isArray(ctrlPath) ? (ctrlPath[0] ?? "") : ctrlPath;
        const mPath = Array.isArray(routePath) ? (routePath[0] ?? "") : routePath;

        const full = `/${[ctrlPrefix, mPath].filter(Boolean).join("/")}`.replace(/\/+/g, "/");

        out.push({
          controller: c.metatype.name ?? "UnknownController",
          method: methodName(routeMethod),
          path: full,
        });
      }
    }

    out.sort((a, b) => (a.path + a.method).localeCompare(b.path + b.method));
    return { ok: true, count: out.length, routes: out };
  }
}