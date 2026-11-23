import { join } from "node:path";
import { logSettings, parseSettings } from "@arcturus/service-runtime";
import { config as loadEnvFiles } from "dotenv";
import { z } from "zod";

const schema = z.object({
  PORT: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().max(65_535)),
  ...logSettings,
});

export function parseConfig(source: Record<string, string | undefined>) {
  const settings = parseSettings(schema, source);
  return Object.freeze({
    port: settings.PORT,
    log: Object.freeze({ level: settings.LOG_LEVEL, format: settings.LOG_FORMAT }),
  });
}

export type Config = ReturnType<typeof parseConfig>;

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
