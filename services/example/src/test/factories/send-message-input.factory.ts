import { Factory } from "fishery";

import type { SendMessageInput } from "../../messaging/send-message/schemas.ts";

export const sendMessageInputFactory = Factory.define<SendMessageInput>(({ sequence }) => ({
  body: `Test message ${sequence}`,
}));
