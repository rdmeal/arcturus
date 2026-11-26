import { describe, expect, test } from "vite-plus/test";
import { z } from "zod";

import { captureLog, silenceLog } from "../test/capture-log.ts";
import { ConflictError, NotFoundError, RuleViolationError } from "./domain-error.ts";
import { createServiceApp } from "./service-app.ts";
import { validateRequest } from "./validate-request.ts";

const ERROR = 50;
const DEBUG = 20;
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
    silenceLog();

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
    silenceLog();

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
    silenceLog();

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
    silenceLog();

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
    silenceLog();

    const domainError = await failingApp.request("/not-found");
    const bug = await failingApp.request("/bug");

    expect(
      [domainError, bug].map((response) => response.headers.get("content-type")),
    ).toStrictEqual(["application/problem+json", "application/problem+json"]);
  });
});

const validatingApp = createServiceApp().post(
  "/things",
  validateRequest("json", z.object({ name: z.string().min(1), size: z.number() })),
  (c) => c.json({ name: c.req.valid("json").name }),
);

const postThing = (body: string) =>
  validatingApp.request("/things", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
  });

const problemWithIssues = z.looseObject({
  issues: z.array(z.object({ path: z.string(), code: z.string(), message: z.string() })),
});

describe("request validation", () => {
  test("an invalid request answers 400 problem details with invalid-request and each issue's path, code and message", async () => {
    silenceLog();

    const response = await postThing(JSON.stringify({ name: "", size: "large" }));

    expect(response.status).toBe(400);
    expect(response.headers.get("content-type")).toBe("application/problem+json");
    const { issues, ...body } = problemWithIssues.parse(await response.json());
    expect(body).toStrictEqual({
      type: "about:blank",
      title: "Bad Request",
      status: 400,
      detail: "The request is not valid.",
      code: "invalid-request",
    });
    // zod writes the messages; only their presence is the service's behaviour.
    expect(issues.map(({ path, code }) => ({ path, code }))).toStrictEqual([
      { path: "name", code: "too_small" },
      { path: "size", code: "invalid_type" },
    ]);
    expect(issues.every(({ message }) => message.length > 0)).toBe(true);
  });

  test("a malformed JSON body answers 400 problem details with invalid-request", async () => {
    silenceLog();

    const response = await postThing("{ not json");

    expect(response.status).toBe(400);
    expect(await response.json()).toStrictEqual({
      type: "about:blank",
      title: "Bad Request",
      status: 400,
      detail: "The request is not valid.",
      code: "invalid-request",
    });
  });

  test("a valid request reaches the handler with its parsed input", async () => {
    silenceLog();

    const response = await postThing(JSON.stringify({ name: "box", size: 3 }));

    expect(response.status).toBe(200);
    expect(await response.json()).toStrictEqual({ name: "box" });
  });
});
