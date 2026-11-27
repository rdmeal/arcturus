import { randomUUID } from "node:crypto";

import { Factory } from "fishery";

import type { ReceiveMessageInput } from "../../inbox/receive-message/schemas.ts";

export const receiveMessageInputFactory = Factory.define<ReceiveMessageInput>(({ sequence }) => ({
  messageId: randomUUID(),
  body: `Received message ${sequence}`,
}));
