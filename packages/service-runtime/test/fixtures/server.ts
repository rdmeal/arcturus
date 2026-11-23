import { Hono } from "hono";
import { health, startServer } from "../../src/index.ts";

// A tiny service for the shutdown tests: `node server.ts <shutdownTimeoutMs>`.
// It logs `listening` with the bound port, which the tests read from stdout.
const shutdownTimeoutMs = Number(process.argv[2]);

const app = new Hono().route("/health", health()).get("/slow", async (c) => {
  await new Promise((resolve) => setTimeout(resolve, Number(c.req.query("ms"))));
  return c.json({ status: "done" });
});

await startServer({ app, port: 0, shutdownTimeoutMs });
