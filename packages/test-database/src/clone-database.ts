import { randomBytes } from "node:crypto";

import { escapeIdentifier } from "pg";
import { inject } from "vite-plus/test";

import { administer } from "./administer.ts";
import { connectionString } from "./provided-context.ts";

export interface ClonedDatabase {
  readonly name: string;
  readonly connectionString: string;
}

const prefixPattern = /^[a-z][a-z0-9_]*$/u;
const randomSuffixBytes = 6;

/**
 * Creates a database of its own for one test, named `<prefix>_test_<random>`,
 * cloned from `template` (by default the empty `template0`). It is dropped by
 * the function passed to `onCleanup`, which a fixture or test registers to run
 * when the test ends.
 */
export const cloneDatabase = async (options: {
  prefix: string;
  template?: string;
  onCleanup: (cleanup: () => Promise<void>) => void;
}): Promise<ClonedDatabase> => {
  const { prefix, template = "template0", onCleanup } = options;
  const server = inject("testDatabaseServer");
  if (!prefixPattern.test(prefix)) {
    throw new Error(`A database prefix is lowercase letters, digits and _, got ${prefix}`);
  }
  const name = `${prefix}_test_${randomBytes(randomSuffixBytes).toString("hex")}`;
  await administer(
    server,
    `create database ${escapeIdentifier(name)} template ${escapeIdentifier(template)}`,
  );
  onCleanup(async () => {
    await administer(server, `drop database if exists ${escapeIdentifier(name)} with (force)`);
  });
  return { name, connectionString: connectionString(server, name) };
};
