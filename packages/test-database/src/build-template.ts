import { migrate } from "graphile-migrate";
import { runMigrations } from "graphile-worker";
import { escapeIdentifier } from "pg";

import { administer } from "./administer.ts";
import { connectionString } from "./provided-context.ts";
import type { TestDatabaseServer } from "./provided-context.ts";

const connectionsClosedTimeoutMs = 5000;
const connectionsPollMs = 25;

// Graphile Migrate keeps its pool open for a moment after `migrate` returns, and
// exits the process if one of its idle connections is killed. So wait for every
// connection to close by itself, rather than terminating them.
const waitForNoConnections = async (
  server: TestDatabaseServer,
  name: string,
  deadline = Date.now() + connectionsClosedTimeoutMs,
): Promise<void> => {
  const rows = await administer(server, "select 1 from pg_stat_activity where datname = $1", [
    name,
  ]);
  if (rows.length === 0) {
    return;
  }
  if (Date.now() > deadline) {
    throw new Error(`Connections to ${name} were still open after building it as a template`);
  }
  await new Promise((resolve) => {
    setTimeout(resolve, connectionsPollMs);
  });
  await waitForNoConnections(server, name, deadline);
};

/** The template a service's test databases are cloned from, such as `example_template`. */
export const templateName = (database: string): string => `${database}_template`;

/**
 * Creates the template database `name`: the committed migrations in
 * `migrationsFolder`, then graphile-worker's schema, so a test can queue jobs.
 * The template then accepts no connections, because Postgres can't clone a
 * database that anything is connected to.
 */
export const buildTemplate = async (options: {
  server: TestDatabaseServer;
  name: string;
  migrationsFolder: string;
}): Promise<void> => {
  const { server, name, migrationsFolder } = options;
  const database = connectionString(server, name);
  await administer(server, `create database ${escapeIdentifier(name)} template template0`);
  // Explicit settings rather than the service's .gmrc.cjs, which would load the
  // service's env files and run its shadow-only pg_dump action.
  await migrate({ connectionString: database, migrationsFolder });
  await runMigrations({ connectionString: database });
  await waitForNoConnections(server, name);
  await administer(
    server,
    `alter database ${escapeIdentifier(name)} with is_template true allow_connections false`,
  );
};
