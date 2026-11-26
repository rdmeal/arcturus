import { Writable } from "node:stream";

import { z } from "zod";

import { configureLog } from "../src/log.ts";

const logRecord = z.record(z.string(), z.unknown());

/** Sends the logger's JSON lines to memory, at `debug`, and returns a reader for them. */
export const captureLog = (): (() => Record<string, unknown>[]) => {
  const lines: string[] = [];
  const destination = new Writable({
    write(chunk, _encoding, callback) {
      lines.push(...String(chunk).trimEnd().split("\n"));
      callback();
    },
  });
  configureLog({ level: "debug", format: "json", destination });
  return () => lines.map((line) => logRecord.parse(JSON.parse(line)));
};

/** Turns the logger off, for a test that doesn't read its lines. */
export const silenceLog = (): void => {
  configureLog({ level: "silent", format: "json" });
};
