import { Client } from "pg";

import { connectionString } from "./provided-context.ts";
import type { TestDatabaseServer } from "./provided-context.ts";

/**
 * Runs `statement` on the server's maintenance database, which no test uses,
 * and returns its rows.
 */
export const administer = async (
  server: TestDatabaseServer,
  statement: string,
  values: readonly unknown[] = [],
): Promise<Record<string, unknown>[]> => {
  const client = new Client({ connectionString: connectionString(server, "postgres") });
  await client.connect();
  try {
    const result = await client.query<Record<string, unknown>>(statement, [...values]);
    return result.rows;
  } finally {
    await client.end();
  }
};
