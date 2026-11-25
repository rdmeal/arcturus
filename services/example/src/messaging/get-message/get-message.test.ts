import { describe, expect } from "vite-plus/test";

import { sendMessage } from "../../test/arrange.ts";
import { test } from "../../test/test.ts";

describe("GET /messaging/get-message", () => {
  test("returns a sent message with its body and creation time", async ({ client }) => {
    const id = await sendMessage(client, { body: "Hello" });

    const response = await client.messaging["get-message"].$get({ query: { id } });

    expect(response.status).toBe(200);
    expect(await response.json()).toStrictEqual({
      id,
      body: "Hello",
      createdAt: "2030-01-01T00:00:00.000Z",
    });
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
});
