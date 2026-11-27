import { setTimeout as sleep } from "node:timers/promises";

import { cloneDatabase } from "@arcturus/test-database";
import { describe, expect, onTestFinished, test } from "vite-plus/test";

import { captureLog } from "../test/capture-log.ts";
import { annotate } from "./context.ts";
import { createDatabase } from "./database.ts";
import { startWorker } from "./jobs.ts";
import { createServiceApp } from "./service-app.ts";

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

describe("readiness", () => {
  test("ready answers not-ready when the database is unreachable", async () => {
    const drops: (() => Promise<void>)[] = [];
    const { connectionString } = await cloneDatabase({
      prefix: "runtime",
      onCleanup: (drop) => {
        drops.push(drop);
      },
    });
    // The pool needs its database to start, so it goes away after the service is up.
    const { db, close } = await createDatabase({ connectionString });
    onTestFinished(close);
    await Promise.all(drops.map((drop) => drop()));

    const response = await createServiceApp({ db }).request("/health/ready");

    expect(response.status).toBe(503);
    expect(await response.json()).toStrictEqual({ status: "not-ready" });
  });

  test("ready answers ready when the database answers", async () => {
    const { connectionString } = await cloneDatabase({
      prefix: "runtime",
      onCleanup: onTestFinished,
    });
    const { db, close } = await createDatabase({ connectionString });
    onTestFinished(close);

    const response = await createServiceApp({ db }).request("/health/ready");

    expect(response.status).toBe(200);
    expect(await response.json()).toStrictEqual({ status: "ready" });
  });

  test("ready answers ready for a service without a database", async () => {
    const response = await createServiceApp().request("/health/ready");

    expect(response.status).toBe(200);
    expect(await response.json()).toStrictEqual({ status: "ready" });
  });

  test("ready answers not-ready when the worker isn't running", async () => {
    const { connectionString } = await cloneDatabase({
      prefix: "runtime",
      onCleanup: onTestFinished,
    });
    const worker = await startWorker({ connectionString, taskList: {} });
    await worker.stop();

    const response = await createServiceApp({ worker }).request("/health/ready");

    expect(response.status).toBe(503);
    expect(await response.json()).toStrictEqual({ status: "not-ready" });
  });
});
