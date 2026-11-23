import { ConfigError, configureLog, log, startServer } from "@arcturus/service-runtime";

import { createApp } from "./app.ts";
import { loadConfig } from "./config.ts";

try {
  const config = loadConfig();
  configureLog(config.log);
  await startServer({ app: createApp({ config }), port: config.port });
} catch (err) {
  if (!(err instanceof ConfigError)) throw err;
  log.fatal({ err }, "invalid configuration");
  process.exitCode = 1;
}
