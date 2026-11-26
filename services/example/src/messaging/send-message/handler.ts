import { randomUUID } from "node:crypto";

import type { Deps } from "../../app.ts";
import { insertMessage } from "./queries.ts";
import type { SendMessageInput, SendMessageOutput } from "./schemas.ts";

export const sendMessage = async (
  deps: Pick<Deps, "db" | "clock">,
  input: SendMessageInput,
): Promise<SendMessageOutput> => {
  const id = randomUUID();
  await deps.db.transaction(async (connection) => {
    await insertMessage(connection, { id, body: input.body, createdAt: deps.clock.now() });
  });
  return { id };
};
