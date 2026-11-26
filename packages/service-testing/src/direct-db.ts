// Only a service's `src/test/direct-db.ts` may import this module
// (docs/patterns/service-api-test.md rule 13).
import type { Database } from "@arcturus/service-runtime";

import { databases } from "./test-database.ts";
import type { TestDatabase } from "./test-database.ts";

/** The database behind the `db` fixture, for a service's direct inserts and reads. */
export const connectionOf = (db: TestDatabase): Database => {
  const database = databases.get(db);
  if (database === undefined) {
    throw new Error(`No database is open for ${db.name}`);
  }
  return database;
};
