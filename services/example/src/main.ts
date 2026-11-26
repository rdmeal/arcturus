import {
  ConfigError,
  configureLog,
  createDatabase,
  log,
  startServer,
  systemClock,
} from "@arcturus/service-runtime";

import { createApp } from "./app.ts";
import { loadConfig } from "./config.ts";

try {
  const config = loadConfig();
  configureLog(config.log);
  const { db, close } = await createDatabase(config.database);
  await startServer({
    app: createApp({ config, db, clock: systemClock }),
    port: config.port,
    onClose: close,
  });
} catch (error) {
  if (!(error instanceof ConfigError)) {
    throw error;
  }
  log.fatal({ err: error }, "invalid configuration");
  process.exitCode = 1;
}
