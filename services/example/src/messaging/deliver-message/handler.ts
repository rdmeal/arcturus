import { annotate, log, NotFoundError } from "@arcturus/service-runtime";

import type { Deps } from "../../app.ts";
import { markDelivered, selectMessageToDeliver } from "./queries.ts";
import type { DeliverMessagePayload } from "./schemas.ts";

// A job can run more than once, so a delivered message isn't sent again. The
// call is made outside any transaction (docs/patterns/database-transaction.md).
export const deliverMessage = async (
  deps: Pick<Deps, "db" | "clock" | "inbox">,
  payload: DeliverMessagePayload,
): Promise<void> => {
  annotate({ messageId: payload.messageId });
  const message = await deps.db.read((connection) =>
    selectMessageToDeliver(connection, payload.messageId),
  );
  if (message === null) {
    throw new NotFoundError("message-not-found", "No message has this ID.");
  }
  if (message.deliveredAt !== null) {
    log.debug("the message was already delivered");
    return;
  }
  await deps.inbox.receiveMessage({ messageId: payload.messageId, body: message.body });
  await deps.db.transaction((connection) =>
    markDelivered(connection, { id: payload.messageId, deliveredAt: deps.clock.now() }),
  );
  log.debug("message delivered");
};
