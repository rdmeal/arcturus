import type { DeepPartial } from "fishery";
import type { testClient } from "hono/testing";

import type { AppType } from "../app.ts";
import type { ReceiveMessageInput } from "../inbox/receive-message/schemas.ts";
import type { SendMessageInput } from "../messaging/send-message/schemas.ts";
import { receiveMessageInputFactory } from "./factories/receive-message-input.factory.ts";
import { sendMessageInputFactory } from "./factories/send-message-input.factory.ts";

type Client = ReturnType<typeof testClient<AppType>>;

const created = 201;
const noContent = 204;

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

/** Posts a message built from `overrides` to the inbox, and returns what was posted. */
export const receiveMessage = async (
  client: Client,
  overrides: DeepPartial<ReceiveMessageInput> = {},
): Promise<ReceiveMessageInput> => {
  const input = receiveMessageInputFactory.build(overrides);
  const response = await client.inbox["receive-message"].$post({ json: input });
  if (response.status !== noContent) {
    throw new Error(`Receiving a message answered ${response.status}`);
  }
  return input;
};
