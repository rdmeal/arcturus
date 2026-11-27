import { configureLog } from "@arcturus/service-runtime";
import type { Clock, Database, TaskList, Worker } from "@arcturus/service-runtime";
import type { Hono } from "hono";
import { testClient } from "hono/testing";
import { test as baseTest } from "vite-plus/test";

import { startCapture, testDestination } from "./capture-logs.ts";
import type { LogRecord } from "./capture-logs.ts";
import { createTestWorker, runQueuedJobs } from "./jobs.ts";
import type { RunJobsOptions } from "./jobs.ts";
import { startNetwork } from "./network.ts";
import type { AnyHandler } from "./network.ts";
import { createTestClock } from "./test-clock.ts";
import {
  connectionStrings,
  databaseOf,
  noTestDatabase,
  openTestDatabase,
} from "./test-database.ts";

// oxlint-disable-next-line typescript/no-explicit-any -- `any`, so that every app's env and schema fit.
type AnyHono = Hono<any, any, any>;

export const createServiceTest = <TConfig, TDeps, TApp extends AnyHono>(options: {
  parseConfig: (source: Record<string, string | undefined>) => TConfig;
  testConfig: Record<string, string>;
  /** The service's database name, such as `example`, if it has a database. */
  database?: string;
  /** Builds the service's deps from the fixtures, as `main.ts` builds them in production. */
  createDeps: (fixtures: { config: TConfig; db: Database; clock: Clock; worker: Worker }) => TDeps;
  createApp: (deps: TDeps) => TApp;
  /** The service's task list, for `runJobs`, if it has jobs. */
  createTaskList?: (deps: TDeps) => TaskList;
  /** The default handler of every endpoint the service calls. */
  handlers?: readonly AnyHandler[];
  // oxlint-disable-next-line typescript/explicit-module-boundary-types -- Vitest's `extend` returns a type built from helpers it doesn't export
}) => {
  configureLog({ level: "debug", format: "json", destination: testDestination });
  const parsedConfig = options.parseConfig(options.testConfig);

  return (
    baseTest
      // One MSW server per test file, because tests within a file run in order.
      // oxlint-disable-next-line eslint/no-empty-pattern -- Vitest reads a fixture's dependencies from its first parameter, which must be a destructuring pattern.
      .extend("mswServer", { scope: "file", auto: true }, ({}, { onCleanup }) => {
        const server = startNetwork(options.handlers ?? []);
        onCleanup(() => {
          server.close();
        });
        return server;
      })
      // Automatic, so every test's outbound calls meet the strict server and start from the defaults.
      .extend("network", { auto: true }, ({ mswServer }, { onCleanup }) => {
        onCleanup(() => {
          mswServer.resetHandlers();
        });
        return mswServer;
      })
      .extend("config", () => parsedConfig)
      .extend("clock", () => createTestClock())
      // oxlint-disable-next-line eslint/no-empty-pattern -- Vitest reads a fixture's dependencies from its first parameter, which must be a destructuring pattern.
      .extend("db", ({}, { onCleanup }) =>
        options.database === undefined
          ? Promise.resolve(noTestDatabase())
          : openTestDatabase(options.database, onCleanup),
      )
      .extend("worker", () => createTestWorker())
      .extend("deps", ({ config, db, clock, worker }) =>
        options.createDeps({ config, db: databaseOf(db), clock, worker }),
      )
      .extend("client", ({ deps }) => testClient(options.createApp(deps)))
      .extend("runJobs", ({ deps, db }) => (runOptions?: RunJobsOptions): Promise<void> => {
        const connectionString = connectionStrings.get(db);
        if (connectionString === undefined || options.createTaskList === undefined) {
          return Promise.reject(
            new Error("runJobs needs the service's database and createTaskList"),
          );
        }
        return runQueuedJobs(connectionString, options.createTaskList(deps), runOptions);
      })
      // oxlint-disable-next-line eslint/no-empty-pattern -- Vitest reads a fixture's dependencies from its first parameter, which must be a destructuring pattern.
      .extend("captureLogs", ({}, { onCleanup }) => {
        const capture = startCapture();
        onCleanup(capture.stop);
        return (): readonly LogRecord[] => capture.read();
      })
  );
};
