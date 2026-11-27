import { defineTask } from "@arcturus/service-runtime";

import { deliverMessage } from "./handler.ts";
import { deliverMessagePayload } from "./schemas.ts";

export const deliverMessageTask = defineTask(
  "messaging.deliver-message",
  deliverMessagePayload,
  deliverMessage,
);
