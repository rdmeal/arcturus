import { describe, expect } from "vite-plus/test";

import { receiveMessageInputFactory } from "../../test/factories/receive-message-input.factory.ts";
import { test } from "../../test/test.ts";

describe("POST /inbox/receive-message", () => {
  test("answers 204 and stores the message", async ({ client }) => {
    const input = receiveMessageInputFactory.build({ body: "Hello" });

    const response = await client.inbox["receive-message"].$post({ json: input });

    expect(response.status).toBe(204);
    const listed = await client.inbox["list-received-messages"].$get();
    expect(await listed.json()).toStrictEqual({
      messages: [
        { messageId: input.messageId, body: "Hello", receivedAt: "2030-01-01T00:00:00.000Z" },
      ],
    });
  });

  test("answers 204 to a repeated message and stores it once", async ({ client, clock }) => {
    const input = receiveMessageInputFactory.build({ body: "Hello" });
    const first = await client.inbox["receive-message"].$post({ json: input });
    clock.advance(60_000);

    const repeat = await client.inbox["receive-message"].$post({ json: input });

    expect([first.status, repeat.status]).toStrictEqual([204, 204]);
    const listed = await client.inbox["list-received-messages"].$get();
    expect(await listed.json()).toStrictEqual({
      messages: [
        { messageId: input.messageId, body: "Hello", receivedAt: "2030-01-01T00:00:00.000Z" },
      ],
    });
  });

  test("answers 400 problem details for a message ID that isn't a UUID", async ({ client }) => {
    const response = await client.inbox["receive-message"].$post({
      json: receiveMessageInputFactory.build({ messageId: "not-a-uuid" }),
    });

    expect(response.status).toBe(400);
    // zod writes each issue's message, so only the issue's path and code are matched.
    expect(await response.json()).toMatchObject({
      status: 400,
      code: "invalid-request",
      issues: [{ path: "messageId", code: "invalid_format" }],
    });
  });
});
