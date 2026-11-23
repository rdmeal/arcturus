import { createServiceTest } from "@arcturus/service-testing";
import { createApp } from "../app.ts";
import { parseConfig } from "../config.ts";

export const test = createServiceTest({
  parseConfig,
  testConfig: { PORT: "0" },
  createApp: ({ config }) => createApp({ config }),
});
