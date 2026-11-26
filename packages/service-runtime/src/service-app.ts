import { performance } from "node:perf_hooks";

import { Hono } from "hono";
import type { MiddlewareHandler } from "hono";
import { matchedRoutes } from "hono/route";

import { withContextFields } from "./context.ts";
import type { Database } from "./database.ts";
import { health } from "./health.ts";
import { log } from "./log.ts";

const MICROSECONDS_PER_MS = 1000;

const roundToMicroseconds = (ms: number): number =>
  Math.round(ms * MICROSECONDS_PER_MS) / MICROSECONDS_PER_MS;

const requestLogging = (): MiddlewareHandler => {
  const middleware: MiddlewareHandler = (c, next) =>
    withContextFields(async () => {
      const start = performance.now();
      await next();
      const durationMs = roundToMicroseconds(performance.now() - start);

      // When nothing else matched, the last matched route is this middleware's own `/*`.
      const last = matchedRoutes(c).at(-1);
      const route = last === undefined || last.handler === middleware ? undefined : last.path;
      // Probes call the health endpoints every few seconds, and would drown the other lines.
      const level = route?.startsWith("/health/") === true ? "debug" : "info";

      log[level](
        { method: c.req.method, route, status: c.res.status, durationMs },
        "request completed",
      );
    });
  return middleware;
};

/**
 * The app every service's `createApp` starts from:
 * docs/adr/0049-build-every-services-app-from-one-runtime-factory.md. A service
 * with a database passes it, so readiness checks it.
 */
// oxlint-disable-next-line typescript/explicit-module-boundary-types -- a Hono app's type is its routes, inferred so the RPC client follows them
export const createServiceApp = (options: { db?: Database } = {}) => {
  return new Hono().use(requestLogging()).route("/health", health(options.db));
};
