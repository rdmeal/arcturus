import { NotFoundError } from "@arcturus/service-runtime";

import type { Deps } from "../../app.ts";
import { selectMessage } from "./queries.ts";
import type { GetMessageInput, GetMessageOutput } from "./schemas.ts";

export const getMessage = async (
  deps: Pick<Deps, "db">,
  input: GetMessageInput,
): Promise<GetMessageOutput> => {
  const row = await deps.db.read((connection) => selectMessage(connection, input.id));
  if (row === null) {
    throw new NotFoundError("message-not-found", "No message has this ID.");
  }
  return {
    id: row.id,
    body: row.body,
    createdAt: row.createdAt.toISOString(),
    deliveredAt: row.deliveredAt?.toISOString() ?? null,
  };
};
