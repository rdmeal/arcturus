import { describe, expect } from "vite-plus/test";
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

  test("rejects a message with an empty body", async ({ client }) => {
    const response = await client.messaging["send-message"].$post({
      json: sendMessageInputFactory.build({ body: "" }),
    });

    expect(response.status).toBe(400);
  });
});
