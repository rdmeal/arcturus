import { join } from "node:path";

import { logSettings, parseSettings } from "@arcturus/service-runtime";
import { config as loadEnvFiles } from "dotenv";
import { z } from "zod";

const schema = z.object({
  PORT: z.string().regex(/^\d+$/u).transform(Number).pipe(z.number().max(65_535)),
  ...logSettings,
});

type Settings = z.output<typeof schema>;

export interface Config {
  readonly port: number;
  readonly log: Readonly<{ level: Settings["LOG_LEVEL"]; format: Settings["LOG_FORMAT"] }>;
}

export function parseConfig(source: Record<string, string | undefined>): Config {
  const settings = parseSettings(schema, source);
  return Object.freeze({
    port: settings.PORT,
    log: Object.freeze({ level: settings.LOG_LEVEL, format: settings.LOG_FORMAT }),
  });
}

export function loadConfig(): Config {
  const packageFolder = join(import.meta.dirname, "..");
  const fileValues: Record<string, string> = {};
  // dotenv keeps the first value it finds, so `.env` overrides `.env.development`.
  loadEnvFiles({
    path: [join(packageFolder, ".env"), join(packageFolder, ".env.development")],
    processEnv: fileValues,
    quiet: true,
  });
  return parseConfig({ ...fileValues, ...process.env });
}
