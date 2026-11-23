import { Hono } from "hono";

/** Mount with `.route("/health", health())`. */
export function health() {
  return new Hono()
    .get("/live", (c) => c.json({ status: "live" as const }))
    .get("/ready", (c) => c.json({ status: "ready" as const }));
}
