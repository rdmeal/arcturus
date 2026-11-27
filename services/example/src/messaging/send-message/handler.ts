import { randomUUID } from "node:crypto";

import { addJob } from "@arcturus/service-runtime";

import type { Deps } from "../../app.ts";
import { deliverMessageTask } from "../deliver-message/task.ts";
import { insertMessage } from "./queries.ts";
import type { SendMessageInput, SendMessageOutput } from "./schemas.ts";

export const sendMessage = async (
  deps: Pick<Deps, "db" | "clock">,
  input: SendMessageInput,
): Promise<SendMessageOutput> => {
  const id = randomUUID();
  await deps.db.transaction(async (connection) => {
    await insertMessage(connection, { id, body: input.body, createdAt: deps.clock.now() });
    await addJob(connection, deliverMessageTask, { messageId: id });
  });
  return { id };
};
