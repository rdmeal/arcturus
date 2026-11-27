import { createTaskList } from "@arcturus/service-runtime";
import { createServiceTest } from "@arcturus/service-testing";

import { createApp } from "../app.ts";
import type { AppType } from "../app.ts";
import { inboxHandlers } from "../clients/inbox/inbox.handlers.ts";
import { createInboxClient } from "../clients/inbox/inbox.ts";
import { parseConfig } from "../config.ts";
import { tasks } from "../tasks.ts";

export const test = createServiceTest({
  parseConfig,
  // The `db` fixture is the test's database, so DATABASE_URL is never used.
  testConfig: {
    PORT: "0",
    DATABASE_URL: "postgres://unused@localhost/unused",
    DELIVERY_URL: "http://inbox.test/inbox/receive-message",
  },
  database: "example",
  createDeps: ({ config, db, clock, worker }) => ({
    config,
    db,
    clock,
    worker,
    inbox: createInboxClient(config.delivery),
  }),
  createApp: (deps): AppType => createApp(deps),
  createTaskList: (deps) => createTaskList(tasks, deps),
  handlers: inboxHandlers,
});
