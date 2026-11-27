import { describe, expect } from "vite-plus/test";

import { receiveMessage } from "../../test/arrange.ts";
import { test } from "../../test/test.ts";

describe("GET /inbox/list-received-messages", () => {
  test("lists no messages before any are received", async ({ client }) => {
    const response = await client.inbox["list-received-messages"].$get();

    expect(response.status).toBe(200);
    expect(await response.json()).toStrictEqual({ messages: [] });
  });

  test("lists received messages in the order they arrived", async ({ client, clock }) => {
    const first = await receiveMessage(client);
    clock.advance(1000);
    const second = await receiveMessage(client);

    const response = await client.inbox["list-received-messages"].$get();

    expect(await response.json()).toStrictEqual({
      messages: [
        { messageId: first.messageId, body: first.body, receivedAt: "2030-01-01T00:00:00.000Z" },
        { messageId: second.messageId, body: second.body, receivedAt: "2030-01-01T00:00:01.000Z" },
      ],
    });
  });
});
