import { Writable } from "node:stream";

import { configureLog } from "@arcturus/service-runtime";
import type { Hono } from "hono";
import { testClient } from "hono/testing";
import { test as baseTest } from "vite-plus/test";

// Vitest attaches each `console.log` line to the running test and shows it only if the test fails.
const consoleDestination = new Writable({
  write(chunk, _encoding, done) {
    console.log(String(chunk).trimEnd());
    done();
  },
});

export function createServiceTest<
  TConfig,
  // `any`, so that every app's env and schema fit.
  TApp extends Hono<any, any, any>,
>(options: {
  parseConfig: (source: Record<string, string | undefined>) => TConfig;
  testConfig: Record<string, string>;
  createApp: (fixtures: { config: TConfig }) => TApp;
}) {
  configureLog({ level: "debug", format: "pretty", destination: consoleDestination });
  const parsedConfig = options.parseConfig(options.testConfig);

  return baseTest
    .extend("config", () => parsedConfig)
    .extend("client", ({ config }) => testClient(options.createApp({ config })));
}
