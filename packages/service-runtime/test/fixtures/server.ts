import { setTimeout as sleep } from "node:timers/promises";

import { createServiceApp, log, startServer } from "../../src/index.ts";

// A tiny service for the shutdown tests: `node server.ts <shutdownTimeoutMs>`.
// It logs `listening` with the bound port, which the tests read from stdout.
const shutdownTimeoutMs = Number(process.argv[2]);

const app = createServiceApp().get("/slow", async (c) => {
  await sleep(Number(c.req.query("ms")));
  log.info("slow request finished");
  return c.json({ status: "done" });
});

await startServer({
  app,
  port: 0,
  shutdownTimeoutMs,
  onClose: () => {
    log.info("onClose ran");
    return Promise.resolve();
  },
});
