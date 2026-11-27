import { randomUUID } from "node:crypto";

import type { ProblemDetails } from "@arcturus/service-runtime";
import type { InferResponseType } from "hono/client";
import { describe, expect, expectTypeOf } from "vite-plus/test";

import { sendMessage } from "../../test/arrange.ts";
import { test } from "../../test/test.ts";

const DEBUG = 20;

describe("GET /messaging/get-message", () => {
  test("returns a sent message with its body and creation time", async ({ client }) => {
    const id = await sendMessage(client, { body: "Hello" });

    const response = await client.messaging["get-message"].$get({ query: { id } });

    expect(response.status).toBe(200);
    expect(await response.json()).toStrictEqual({
      id,
      body: "Hello",
      createdAt: "2030-01-01T00:00:00.000Z",
      deliveredAt: null,
    });
  });

  test("shows a delivered message's delivery time", async ({ client, clock, runJobs }) => {
    const id = await sendMessage(client);
    clock.advance(60_000);
    await runJobs();

    const response = await client.messaging["get-message"].$get({ query: { id } });

    expect(await response.json()).toMatchObject({ deliveredAt: "2030-01-01T00:01:00.000Z" });
  });

  test("returns the later creation time for a message sent after the clock advances", async ({
    client,
    clock,
  }) => {
    clock.advance(60_000);
    const id = await sendMessage(client);

    const response = await client.messaging["get-message"].$get({ query: { id } });

    expect(await response.json()).toMatchObject({ createdAt: "2030-01-01T00:01:00.000Z" });
  });

  test("answers 404 problem details with message-not-found for an unknown message ID", async ({
    client,
  }) => {
    const getMessage = client.messaging["get-message"].$get;

    const response = await getMessage({ query: { id: randomUUID() } });

    expect(response.status).toBe(404);
    expect(await response.json()).toStrictEqual({
      type: "about:blank",
      title: "Not Found",
      status: 404,
      detail: "No message has this ID.",
      code: "message-not-found",
    });
    expectTypeOf<InferResponseType<typeof getMessage, 404>>().toEqualTypeOf<ProblemDetails>();
  });

  test("logs an unknown message ID at debug and at no higher level", async ({
    client,
    captureLogs,
  }) => {
    await client.messaging["get-message"].$get({ query: { id: randomUUID() } });

    const errorLines = captureLogs().filter((record) => record["msg"] !== "request completed");
    expect(errorLines.map((record) => [record["level"], record["code"]])).toStrictEqual([
      [DEBUG, "message-not-found"],
    ]);
  });
});
