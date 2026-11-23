import { Writable } from "node:stream";

import { configureLog } from "@arcturus/service-runtime";
import type { Hono } from "hono";
import { testClient } from "hono/testing";
import { prettyFactory } from "pino-pretty";
import { test as baseTest } from "vite-plus/test";
import { z } from "zod";

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

export const createServiceTest = <TConfig, TApp extends AnyHono>(options: {
  parseConfig: (source: Record<string, string | undefined>) => TConfig;
  testConfig: Record<string, string>;
  createApp: (fixtures: { config: TConfig }) => TApp;
  // oxlint-disable-next-line typescript/explicit-module-boundary-types -- Vitest's `extend` returns a type built from helpers it doesn't export
}) => {
  configureLog({ level: "debug", format: "json", destination: testDestination });
  const parsedConfig = options.parseConfig(options.testConfig);

  return (
    baseTest
      .extend("config", () => parsedConfig)
      .extend("client", ({ config }) => testClient(options.createApp({ config })))
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
