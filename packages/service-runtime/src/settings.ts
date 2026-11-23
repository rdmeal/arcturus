import { z } from "zod";

/** Spread into a service's settings schema: `z.object({ PORT: ..., ...logSettings })`. */
export const logSettings = {
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  LOG_FORMAT: z.enum(["json", "pretty"]).default("json"),
};

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

/** Validates `source` against `schema`, throwing a `ConfigError` that names each bad setting. */
export const parseSettings = <S extends z.ZodType>(
  schema: S,
  source: Record<string, string | undefined>,
): z.output<S> => {
  const result = schema.safeParse(source);
  if (!result.success) {
    throw new ConfigError(z.prettifyError(result.error));
  }
  return result.data;
};
