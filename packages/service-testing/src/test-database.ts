import { createDatabase } from "@arcturus/service-runtime";
import type { Database } from "@arcturus/service-runtime";
import { cloneDatabase, templateName } from "@arcturus/test-database";

/**
 * The `db` fixture's value: a test's own database, which tests hand to their
 * service's `src/test/direct-db.ts` helpers and never query themselves.
 */
export interface TestDatabase {
  readonly name: string;
}

// Kept out of the handle, so only `@arcturus/service-testing/direct-db` reaches it.
export const databases = new WeakMap<TestDatabase, Database>();

// For `runJobs`, whose job runner opens its own connections.
export const connectionStrings = new WeakMap<TestDatabase, string>();

// For a service without a database, whose app never uses it.
const noDatabase: Database = Object.freeze({
  transaction: () => Promise.reject(new Error("This service has no database")),
  read: () => Promise.reject(new Error("This service has no database")),
});

export const noTestDatabase = (): TestDatabase => {
  const handle: TestDatabase = Object.freeze({ name: "none" });
  databases.set(handle, noDatabase);
  return handle;
};

export const databaseOf = (handle: TestDatabase): Database => databases.get(handle) ?? noDatabase;

/**
 * A database of the test's own, cloned from the service's template, with a pool
 * on it. The pool is closed before the database is dropped.
 */
export const openTestDatabase = async (
  database: string,
  onCleanup: (cleanup: () => Promise<void>) => void,
): Promise<TestDatabase> => {
  const drops: (() => Promise<void>)[] = [];
  const { name, connectionString } = await cloneDatabase({
    prefix: database,
    template: templateName(database),
    onCleanup: (drop) => {
      drops.push(drop);
    },
  });
  const opened = await createDatabase({ connectionString }).catch(async (error: unknown) => {
    await Promise.all(drops.map((drop) => drop()));
    throw error;
  });
  onCleanup(async () => {
    await opened.close();
    await Promise.all(drops.map((drop) => drop()));
  });
  const handle: TestDatabase = Object.freeze({ name });
  databases.set(handle, opened.db);
  connectionStrings.set(handle, connectionString);
  return handle;
};
