import { Writable } from "node:stream";

import { configureLog, createDatabase } from "@arcturus/service-runtime";
import type { Clock, Database } from "@arcturus/service-runtime";
import { cloneDatabase, templateName } from "@arcturus/test-database";
import type { Hono } from "hono";
import { testClient } from "hono/testing";
import { prettyFactory } from "pino-pretty";
import { test as baseTest } from "vite-plus/test";
import { z } from "zod";

import { createTestClock } from "./test-clock.ts";
import { databases } from "./test-database.ts";
import type { TestDatabase } from "./test-database.ts";

// oxlint-disable-next-line typescript/no-explicit-any -- `any`, so that every app's env and schema fit.
type AnyHono = Hono<any, any, any>;

const logRecordSchema = z.record(z.string(), z.unknown());

export type LogRecord = z.infer<typeof logRecordSchema>;

/** The records of the test that asked for `captureLogs`, while it runs. */
let capturing: LogRecord[] | undefined;

const prettify = prettyFactory({ colorize: false });

// The logger writes JSON, so records can be captured structured, then printed
// pretty through `console`: Vitest attaches each line to the running test.
const testDestination = new Writable({
  write(chunk, _encoding, done) {
    for (const line of String(chunk).trimEnd().split("\n")) {
      const record = logRecordSchema.parse(JSON.parse(line));
      capturing?.push(record);
      // oxlint-disable-next-line eslint/no-console -- Vitest shows `console.log` lines with their test, and only when it fails.
      console.log(prettify(record).trimEnd());
    }
    done();
  },
});

// For a service without a database, whose app never uses it.
const noDatabase: Database = Object.freeze({
  transaction: () => Promise.reject(new Error("This service has no database")),
  read: () => Promise.reject(new Error("This service has no database")),
});

// A database of the test's own, cloned from the service's template, with a pool
// on it. The pool is closed before the database is dropped.
const openTestDatabase = async (
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
  return handle;
};

export const createServiceTest = <TConfig, TApp extends AnyHono>(options: {
  parseConfig: (source: Record<string, string | undefined>) => TConfig;
  testConfig: Record<string, string>;
  /** The service's database name, such as `example`, if it has a database. */
  database?: string;
  createApp: (fixtures: { config: TConfig; db: Database; clock: Clock }) => TApp;
  // oxlint-disable-next-line typescript/explicit-module-boundary-types -- Vitest's `extend` returns a type built from helpers it doesn't export
}) => {
  configureLog({ level: "debug", format: "json", destination: testDestination });
  const parsedConfig = options.parseConfig(options.testConfig);

  return (
    baseTest
      .extend("config", () => parsedConfig)
      .extend("clock", () => createTestClock())
      // oxlint-disable-next-line eslint/no-empty-pattern -- Vitest reads a fixture's dependencies from its first parameter, which must be a destructuring pattern.
      .extend("db", ({}, { onCleanup }) => {
        if (options.database === undefined) {
          const handle: TestDatabase = Object.freeze({ name: "none" });
          databases.set(handle, noDatabase);
          return Promise.resolve(handle);
        }
        return openTestDatabase(options.database, onCleanup);
      })
      .extend("client", ({ config, db, clock }) =>
        testClient(options.createApp({ config, db: databases.get(db) ?? noDatabase, clock })),
      )
      // oxlint-disable-next-line eslint/no-empty-pattern -- Vitest reads a fixture's dependencies from its first parameter, which must be a destructuring pattern.
      .extend("captureLogs", ({}, { onCleanup }) => {
        const records: LogRecord[] = [];
        capturing = records;
        onCleanup(() => {
          capturing = undefined;
        });
        return (): readonly LogRecord[] => [...records];
      })
  );
};
