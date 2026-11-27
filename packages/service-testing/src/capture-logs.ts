import { Writable } from "node:stream";

import { prettyFactory } from "pino-pretty";
import { z } from "zod";

const logRecordSchema = z.record(z.string(), z.unknown());

export type LogRecord = z.infer<typeof logRecordSchema>;

/** The records of the test that asked for `captureLogs`, while it runs. */
let capturing: LogRecord[] | undefined;

const prettify = prettyFactory({ colorize: false });

// The logger writes JSON, so records can be captured structured, then printed
// pretty through `console`: Vitest attaches each line to the running test.
export const testDestination = new Writable({
  write(chunk, _encoding, done) {
    for (const line of String(chunk).trimEnd().split("\n")) {
      const record = logRecordSchema.parse(JSON.parse(line));
      capturing?.push(record);
      // oxlint-disable-next-line eslint/no-console -- Vitest shows `console.log` lines with their test, and only when it fails.
      console.log(prettify(record).trimEnd());
    }
    done();
  },
});

/** Captures the records written from now until `stop`, and returns a reader for them. */
export const startCapture = (): { read: () => readonly LogRecord[]; stop: () => void } => {
  const records: LogRecord[] = [];
  capturing = records;
  return {
    read: () => [...records],
    stop: () => {
      capturing = undefined;
    },
  };
};
