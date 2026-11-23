import { Writable } from "node:stream";
import { setTimeout as sleep } from "node:timers/promises";

import { describe, expect, test } from "vite-plus/test";
import { z } from "zod";

import { annotate } from "./context.ts";
import { configureLog } from "./log.ts";
import { createServiceApp } from "./service-app.ts";

const logRecord = z.record(z.string(), z.unknown());

const captureLog = () => {
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

const requestLines = (records: Record<string, unknown>[]) =>
  records.filter((record) => record["msg"] === "request completed");

const INFO = 30;
const DEBUG = 20;

const app = createServiceApp().get("/things/:id", async (c) => {
  annotate({ thingId: c.req.param("id") });
  await sleep(Number(c.req.query("delayMs") ?? 0));
  return c.json({ id: c.req.param("id") });
});

describe("request logging", () => {
  test("a request produces exactly one info line with method, matched route, status and duration", async () => {
    const records = captureLog();

    await app.request("/things/t1");

    const lines = requestLines(records());
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({
      level: INFO,
      method: "GET",
      route: "/things/:id",
      status: 200,
    });
    expect(lines[0]?.["durationMs"]).toBeTypeOf("number");
  });

  test("a health request is logged at debug, not info", async () => {
    const records = captureLog();

    await app.request("/health/live");

    expect(requestLines(records()).map((line) => [line["level"], line["route"]])).toStrictEqual([
      [DEBUG, "/health/live"],
    ]);
  });

  test("a request no route matches is logged without a route", async () => {
    const records = captureLog();

    await app.request("/nowhere");

    const lines = requestLines(records());
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({ level: INFO, status: 404 });
    expect(lines[0]).not.toHaveProperty("route");
  });

  test("a field annotated by a handler appears on its request's line", async () => {
    const records = captureLog();

    await app.request("/things/t1");

    expect(requestLines(records()).map((line) => line["thingId"])).toStrictEqual(["t1"]);
  });

  test("concurrent requests each carry only their own annotated fields", async () => {
    const records = captureLog();

    await Promise.all([app.request("/things/t1?delayMs=3"), app.request("/things/t2?delayMs=1")]);

    expect(requestLines(records()).map((line) => line["thingId"])).toStrictEqual(["t2", "t1"]);
  });
});
