import type { ProblemDetails } from "@arcturus/service-runtime";
import type { InferResponseType } from "hono/client";
import { describe, expect, expectTypeOf } from "vite-plus/test";
import { z } from "zod";

import { sendMessageInputFactory } from "../../test/factories/send-message-input.factory.ts";
import { test } from "../../test/test.ts";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;

describe("POST /messaging/send-message", () => {
  test("answers 201 with the new message's ID", async ({ client }) => {
    const response = await client.messaging["send-message"].$post({
      json: sendMessageInputFactory.build(),
    });

    expect(response.status).toBe(201);
    // The typed client can't narrow the body by status, so read it with a schema.
    const { id } = z.object({ id: z.string() }).parse(await response.json());
    expect(id).toMatch(uuid);
  });

  test("answers 400 problem details with invalid-request for an empty body", async ({ client }) => {
    const sendMessage = client.messaging["send-message"].$post;

    const response = await sendMessage({ json: sendMessageInputFactory.build({ body: "" }) });

    expect(response.status).toBe(400);
    // zod writes each issue's message, so only the issue's path and code are matched.
    expect(await response.json()).toMatchObject({
      type: "about:blank",
      title: "Bad Request",
      status: 400,
      detail: "The request is not valid.",
      code: "invalid-request",
      issues: [{ path: "body", code: "too_small" }],
    });
    expectTypeOf<InferResponseType<typeof sendMessage, 400>>().toEqualTypeOf<ProblemDetails>();
  });
});
