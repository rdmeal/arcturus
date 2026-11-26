import { createServer } from "node:http";

import { getRequestListener } from "@hono/node-server";

import { log } from "./log.ts";

const idleSweepIntervalMs = 20;

/**
 * Serves `app`, resolving once it is listening. On SIGTERM or SIGINT it shuts
 * down gracefully, so the process exits 0 once nothing is left running, or it
 * exits 1 if that outlasts `shutdownTimeoutMs`. `onClose` runs once the server
 * has closed, to release what requests used, such as the database pool.
 */
export const startServer = (options: {
  app: { fetch: (req: Request) => Response | Promise<Response> };
  port: number;
  shutdownTimeoutMs?: number;
  onClose?: () => Promise<void>;
}): Promise<{ port: number; close: () => Promise<void> }> => {
  const { app, port, shutdownTimeoutMs = 10_000, onClose } = options;
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
      const stopped = new Promise<void>((resolve) => {
        server.close(() => {
          resolve();
        });
      });
      // A connection that finishes its request stays open (keep-alive), so
      // keep closing connections as they go idle until none are left.
      const sweep = setInterval(() => {
        server.closeIdleConnections();
      }, idleSweepIntervalMs);
      server.closeIdleConnections();
      await stopped;
      clearInterval(sweep);
      await onClose?.();
    })();
    return closing;
  };

  const shutdown = () => {
    const timer = setTimeout(() => {
      // oxlint-disable-next-line unicorn/no-process-exit -- something outlasted the timeout and holds the event loop, so the process can't drain and exit by itself
      process.exit(1);
    }, shutdownTimeoutMs);
    timer.unref();
    // No exit after a clean close: the process exits once its output and telemetry have flushed.
    void close();
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
};
