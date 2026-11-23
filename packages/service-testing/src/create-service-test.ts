import { Writable } from "node:stream";

import { configureLog } from "@arcturus/service-runtime";
import type { Hono } from "hono";
import { testClient } from "hono/testing";
import { test as baseTest } from "vite-plus/test";

// oxlint-disable-next-line typescript/no-explicit-any -- `any`, so that every app's env and schema fit.
type AnyHono = Hono<any, any, any>;

const consoleDestination = new Writable({
  write(chunk, _encoding, done) {
    // oxlint-disable-next-line eslint/no-console -- Vitest attaches each `console.log` line to the running test and shows it only if the test fails.
    console.log(String(chunk).trimEnd());
    done();
  },
});

// oxlint-disable-next-line typescript/explicit-module-boundary-types -- Vitest's `extend` returns a type built from helpers it doesn't export
export function createServiceTest<TConfig, TApp extends AnyHono>(options: {
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
