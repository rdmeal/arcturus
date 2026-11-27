import {
  ConfigError,
  configureLog,
  createDatabase,
  createTaskList,
  log,
  startServer,
  startWorker,
  systemClock,
} from "@arcturus/service-runtime";

import { createApp } from "./app.ts";
import { createInboxClient } from "./clients/inbox/inbox.ts";
import { loadConfig } from "./config.ts";
import { tasks } from "./tasks.ts";

try {
  const config = loadConfig();
  configureLog(config.log);
  const { db, close } = await createDatabase(config.database);
  // The tasks use every dependency but the worker that runs them.
  const taskDeps = { config, db, clock: systemClock, inbox: createInboxClient(config.delivery) };
  const worker = await startWorker({
    connectionString: config.database.connectionString,
    taskList: createTaskList(tasks, taskDeps),
  });
  await startServer({
    app: createApp({ ...taskDeps, worker }),
    port: config.port,
    // The worker's jobs use the pool, so it stops first.
    onClose: async () => {
      await worker.stop();
      await close();
    },
  });
} catch (error) {
  if (!(error instanceof ConfigError)) {
    throw error;
  }
  log.fatal({ err: error }, "invalid configuration");
  process.exitCode = 1;
}
