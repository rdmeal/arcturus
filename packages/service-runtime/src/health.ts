import { Hono } from "hono";

/** Mount with `.route("/health", health())`. */
// oxlint-disable-next-line typescript/explicit-module-boundary-types -- a Hono app's type is its routes, inferred so the RPC client follows them
export const health = () => {
  return new Hono()
    .get("/live", (c) => c.json({ status: "live" as const }))
    .get("/ready", (c) => c.json({ status: "ready" as const }));
};
