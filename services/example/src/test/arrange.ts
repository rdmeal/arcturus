import type { DeepPartial } from "fishery";
import type { testClient } from "hono/testing";

import type { AppType } from "../app.ts";
import type { SendMessageInput } from "../messaging/send-message/schemas.ts";
import { sendMessageInputFactory } from "./factories/send-message-input.factory.ts";

type Client = ReturnType<typeof testClient<AppType>>;

const created = 201;

/** Sends a message built from `overrides`, and returns its ID. */
export const sendMessage = async (
  client: Client,
  overrides: DeepPartial<SendMessageInput> = {},
): Promise<string> => {
  const response = await client.messaging["send-message"].$post({
    json: sendMessageInputFactory.build(overrides),
  });
  if (response.status !== created) {
    throw new Error(`Sending a message answered ${response.status}`);
  }
  const { id } = await response.json();
  return id;
};
