export { type Clock, systemClock } from "./clock.ts";
export { annotate } from "./context.ts";
export { createDatabase, type Database } from "./database.ts";
export { configureLog, log, type LogFormat } from "./log.ts";
export { startServer } from "./server.ts";
export { createServiceApp } from "./service-app.ts";
export { ConfigError, logSettings, parseSettings } from "./settings.ts";
// Slonik's query API, so services write SQL without depending on Slonik's
// version themselves (docs/adr/0011-access-postgresql-with-slonik.md).
export { sql } from "./sql.ts";
export type {
  CommonQueryMethods,
  DatabasePoolConnection,
  DatabaseTransactionConnection,
} from "slonik";
