import { annotate } from "@arcturus/service-runtime";

import type { Deps } from "../../app.ts";
import { insertReceivedMessage } from "./queries.ts";
import type { ReceiveMessageInput } from "./schemas.ts";

// A message can be delivered more than once, so a repeat stores nothing and
// still succeeds (docs/patterns/idempotent-receiver.md).
export const receiveMessage = async (
  deps: Pick<Deps, "db" | "clock">,
  input: ReceiveMessageInput,
): Promise<void> => {
  annotate({ messageId: input.messageId });
  await deps.db.transaction((connection) =>
    insertReceivedMessage(connection, {
      id: input.messageId,
      body: input.body,
      receivedAt: deps.clock.now(),
    }),
  );
};
