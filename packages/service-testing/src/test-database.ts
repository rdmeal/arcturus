import type { Database } from "@arcturus/service-runtime";

/**
 * The `db` fixture's value: a test's own database, which tests hand to their
 * service's `src/test/direct-db.ts` helpers and never query themselves.
 */
export interface TestDatabase {
  readonly name: string;
}

// Kept out of the handle, so only `@arcturus/service-testing/direct-db` reaches it.
export const databases = new WeakMap<TestDatabase, Database>();
