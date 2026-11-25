import { systemClock } from "@arcturus/service-runtime";
import type { Database } from "@arcturus/service-runtime";
import { createServiceTest } from "@arcturus/service-testing";

import { createApp } from "../app.ts";
import { parseConfig } from "../config.ts";

// No test reaches the database yet, so using it fails loudly.
const noDatabase: Database = {
  transaction: () => Promise.reject(new Error("These tests have no database")),
  read: () => Promise.reject(new Error("These tests have no database")),
};

export const test = createServiceTest({
  parseConfig,
  testConfig: { PORT: "0", DATABASE_URL: "postgres://unused@localhost/unused" },
  createApp: ({ config }) => createApp({ config, db: noDatabase, clock: systemClock }),
});
