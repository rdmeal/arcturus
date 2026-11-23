import { createServer } from "node:http";

import { getRequestListener } from "@hono/node-server";

import { log } from "./log.ts";

/**
 * Serves `app`, resolving once it is listening. On SIGTERM or SIGINT it shuts
 * down gracefully and exits 0, or exits 1 if that outlasts `shutdownTimeoutMs`.
 */
export function startServer(options: {
  app: { fetch: (req: Request) => Response | Promise<Response> };
  port: number;
  shutdownTimeoutMs?: number;
}): Promise<{ port: number; close: () => Promise<void> }> {
  const { app, port, shutdownTimeoutMs = 10_000 } = options;
  // Built here rather than by `serve`, whose return type includes HTTP/2
  // servers, which have no `closeIdleConnections`.
  const listener = getRequestListener(app.fetch);
  const server = createServer((incoming, outgoing) => {
    // The listener catches a failed request and answers it itself, as it does under `serve`.
    void listener(incoming, outgoing);
  });

  let closing: Promise<void> | undefined;
  const close = () => {
    closing ??= (async () => {
      log.info("shutting down");
      const stopped = new Promise<void>((done) => {
        server.close(() => {
          done();
        });
      });
      // A connection that finishes its request stays open (keep-alive), so
      // keep closing connections as they go idle until none are left.
      const sweep = setInterval(() => {
        server.closeIdleConnections();
      }, 20);
      server.closeIdleConnections();
      await stopped;
      clearInterval(sweep);
    })();
    return closing;
  };

  const shutdown = () => {
    const timer = setTimeout(() => process.exit(1), shutdownTimeoutMs);
    timer.unref();
    void close().then(() => process.exit(0));
  };

  return new Promise((resolve, reject) => {
    server.listen(port, () => {
      const address = server.address();
      if (address === null || typeof address === "string") {
        reject(new Error(`Expected a TCP address, got ${String(address)}`));
        return;
      }
      // Registered before `listening` is logged, so a signal sent as soon as a
      // caller sees that line is already handled.
      process.once("SIGTERM", shutdown);
      process.once("SIGINT", shutdown);

      log.info({ port: address.port }, "listening");
      resolve({ port: address.port, close });
    });
  });
}
