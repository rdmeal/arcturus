import { Hono } from "hono";
import { sql } from "slonik";

import type { Database } from "./database.ts";
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

/**
 * Mount with `.route("/health", health(db))`. Readiness checks only the
 * service's own database, if it has one.
 */
// oxlint-disable-next-line typescript/explicit-module-boundary-types -- a Hono app's type is its routes, inferred so the RPC client follows them
export const health = (db?: Database) => {
  return new Hono()
    .get("/live", (c) => c.json({ status: "live" as const }))
    .get("/ready", async (c) => {
      if (db !== undefined && !(await isReachable(db))) {
        return c.json({ status: "not-ready" as const }, serviceUnavailable);
      }
      return c.json({ status: "ready" as const });
    });
};
