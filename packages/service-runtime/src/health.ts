import { Hono } from "hono";

/**
 * Health endpoints a service mounts with `.route("/health", health())`. Neither
 * checks anything yet: `/live` answers if the process is up, and `/ready` will
 * check the service's own database and worker once a service has them.
 */
export function health() {
  return new Hono()
    .get("/live", (c) => c.json({ status: "live" as const }))
    .get("/ready", (c) => c.json({ status: "ready" as const }));
}
