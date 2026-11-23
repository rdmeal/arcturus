import { Writable } from "node:stream";
import { setTimeout as sleep } from "node:timers/promises";

import { describe, expect, test } from "vite-plus/test";
import { z } from "zod";

import { annotate, withContextFields } from "./context.ts";
import { configureLog, log } from "./log.ts";

const logRecord = z.record(z.string(), z.unknown());

const captureLog = () => {
  const lines: string[] = [];
  const destination = new Writable({
    write(chunk, _encoding, callback) {
      lines.push(...String(chunk).trimEnd().split("\n"));
      callback();
    },
  });
  configureLog({ level: "info", format: "json", destination });
  return () => lines.map((line) => logRecord.parse(JSON.parse(line)));
};

const workInScope = (matchId: string, delayMs: number) =>
  withContextFields(async () => {
    annotate({ matchId });
    await sleep(delayMs);
    log.info({ scope: matchId }, "work");
    await sleep(delayMs);
    log.info({ scope: matchId }, "more work");
  });

describe("annotate", () => {
  test("an annotated field appears on every later log line in the scope", async () => {
    const records = captureLog();

    await withContextFields(async () => {
      log.info("before");
      annotate({ matchId: "m1" });
      log.info("after");
      await sleep(1);
      log.info("after an await");
    });

    expect(records().map((record) => record["matchId"])).toStrictEqual([undefined, "m1", "m1"]);
  });

  test("a field annotated in one scope never appears on a concurrent scope's lines", async () => {
    const records = captureLog();

    await Promise.all([workInScope("m1", 2), workInScope("m2", 3)]);

    expect(records()).toHaveLength(4);
    for (const record of records()) {
      expect(record["matchId"]).toBe(record["scope"]);
    }
  });

  test("annotate outside a scope adds nothing to log lines", () => {
    const records = captureLog();

    annotate({ matchId: "m1" });
    log.info("outside");

    expect(records().map((record) => record["matchId"])).toStrictEqual([undefined]);
  });

  test("a field passed to the log call overrides an annotated one", () => {
    const records = captureLog();

    withContextFields(() => {
      annotate({ matchId: "m1" });
      log.info({ matchId: "m2" }, "explicit");
    });

    expect(records().map((record) => record["matchId"])).toStrictEqual(["m2"]);
  });
});
