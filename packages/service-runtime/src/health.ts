import { Hono } from "hono";
import { sql } from "slonik";

import type { Database } from "./database.ts";
import type { Worker } from "./jobs.ts";
import { log } from "./log.ts";

const serviceUnavailable = 503;

const isReachable = async (db: Database): Promise<boolean> => {
  try {
    await db.read((connection) => connection.query(sql.unsafe`select 1`));
    return true;
  } catch (error) {
    log.warn({ err: error }, "the database is unreachable");
    return false;
  }
};

const isWorkerRunning = (worker: Worker): boolean => {
  const running = worker.isRunning();
  if (!running) {
    log.warn("the job worker isn't running");
  }
  return running;
};

/**
 * Mount with `.route("/health", health({ db, worker }))`. Readiness checks only
 * the service's own database and job worker, if it has them.
 */
// oxlint-disable-next-line typescript/explicit-module-boundary-types -- a Hono app's type is its routes, inferred so the RPC client follows them
export const health = ({ db, worker }: { db?: Database; worker?: Worker } = {}) => {
  return new Hono()
    .get("/live", (c) => c.json({ status: "live" as const }))
    .get("/ready", async (c) => {
      const ready =
        (db === undefined || (await isReachable(db))) &&
        (worker === undefined || isWorkerRunning(worker));
      if (!ready) {
        return c.json({ status: "not-ready" as const }, serviceUnavailable);
      }
      return c.json({ status: "ready" as const });
    });
};
