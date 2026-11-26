import { createServiceTest } from "@arcturus/service-testing";

import { createApp } from "../app.ts";
import type { AppType } from "../app.ts";
import { parseConfig } from "../config.ts";

export const test = createServiceTest({
  parseConfig,
  // The `db` fixture is the test's database, so DATABASE_URL is never used.
  testConfig: { PORT: "0", DATABASE_URL: "postgres://unused@localhost/unused" },
  database: "example",
  createApp: ({ config, db, clock }): AppType => createApp({ config, db, clock }),
});
