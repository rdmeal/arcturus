import { pino } from "pino";
import type { Logger, LevelWithSilent } from "pino";
import { PinoPretty } from "pino-pretty";

import { currentContextFields } from "./context.ts";

export type LogFormat = "json" | "pretty";

/** The stream pino writes to. Its target is swapped by `configureLog`. */
const sink: { target: { write: (chunk: string) => unknown } } = {
  target: process.stdout,
};

/**
 * The one logger. The instance is never replaced, so `import { log }` stays
 * valid everywhere and instrumentation that patches it keeps working. Until
 * `configureLog` runs it writes JSON at `info` to stdout.
 */
export const log: Logger = pino(
  { level: "info", mixin: currentContextFields },
  {
    write(chunk: string) {
      sink.target.write(chunk);
    },
  },
);

export const configureLog = (options: {
  level: LevelWithSilent;
  format: LogFormat;
  destination?: NodeJS.WritableStream;
}): void => {
  const destination = options.destination ?? process.stdout;
  log.level = options.level;
  // `pretty` is an in-process stream, never a worker-thread transport.
  sink.target = options.format === "pretty" ? PinoPretty({ destination }) : destination;
};
