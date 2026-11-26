import { Writable } from "node:stream";
import { setTimeout as sleep } from "node:timers/promises";

import { cloneDatabase } from "@arcturus/test-database";
import { describe, expect, onTestFinished, test } from "vite-plus/test";
import { z } from "zod";

import { annotate } from "./context.ts";
import { createDatabase } from "./database.ts";
import { ConflictError, NotFoundError, RuleViolationError } from "./domain-error.ts";
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

const ERROR = 50;
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

const WARN = 40;

const failingApp = createServiceApp()
  .get("/not-found", () => {
    throw new NotFoundError("thing-not-found", "No thing has this ID.");
  })
  .get("/conflict", () => {
    throw new ConflictError("thing-already-started", "The thing has already started.");
  })
  .get("/rule-violation", () => {
    throw new RuleViolationError("too-many-things", "A list holds at most three things.");
  })
  .get("/bug", () => {
    throw new TypeError('relation "things" does not exist: select secret from things');
  });

const errorLines = (records: Record<string, unknown>[]) =>
  records.filter((record) => record["msg"] !== "request completed");

describe("error handling", () => {
  test("a not-found error answers 404 problem details with its code and message", async () => {
    const response = await failingApp.request("/not-found");

    expect(response.status).toBe(404);
    expect(await response.json()).toStrictEqual({
      type: "about:blank",
      title: "Not Found",
      status: 404,
      detail: "No thing has this ID.",
      code: "thing-not-found",
    });
  });

  test("a conflict error answers 409 problem details with its code and message", async () => {
    const response = await failingApp.request("/conflict");

    expect(response.status).toBe(409);
    expect(await response.json()).toStrictEqual({
      type: "about:blank",
      title: "Conflict",
      status: 409,
      detail: "The thing has already started.",
      code: "thing-already-started",
    });
  });

  test("a rule violation error answers 422 problem details with its code and message", async () => {
    const response = await failingApp.request("/rule-violation");

    expect(response.status).toBe(422);
    expect(await response.json()).toStrictEqual({
      type: "about:blank",
      title: "Unprocessable Content",
      status: 422,
      detail: "A list holds at most three things.",
      code: "too-many-things",
    });
  });

  test("a domain error is logged at debug and at no higher level", async () => {
    const records = captureLog();

    await failingApp.request("/not-found");

    expect(errorLines(records()).map((line) => [line["level"], line["code"]])).toStrictEqual([
      [DEBUG, "thing-not-found"],
    ]);
  });

  test("an unexpected error answers 500 problem details with nothing from the error", async () => {
    const response = await failingApp.request("/bug");

    expect(response.status).toBe(500);
    const text = await response.text();
    expect(JSON.parse(text)).toStrictEqual({
      type: "about:blank",
      title: "Internal Server Error",
      status: 500,
      detail: "An unexpected error occurred.",
      code: "internal-error",
    });
    expect(text).not.toMatch(/things|secret|TypeError|at /u);
  });

  test("an unexpected error is logged at error with the error as err", async () => {
    const records = captureLog();

    await failingApp.request("/bug");

    const lines = errorLines(records());
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({
      level: ERROR,
      err: {
        type: "TypeError",
        message: 'relation "things" does not exist: select secret from things',
      },
    });
    expect(lines.filter((line) => Number(line["level"]) >= WARN)).toHaveLength(1);
  });

  test("problem details are sent as application/problem+json", async () => {
    const domainError = await failingApp.request("/not-found");
    const bug = await failingApp.request("/bug");

    expect(
      [domainError, bug].map((response) => response.headers.get("content-type")),
    ).toStrictEqual(["application/problem+json", "application/problem+json"]);
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
});
