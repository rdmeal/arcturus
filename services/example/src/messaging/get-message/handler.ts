import type { Deps } from "../../app.ts";
import { selectMessage } from "./queries.ts";
import type { GetMessageInput, GetMessageOutput } from "./schemas.ts";

export const getMessage = async (
  deps: Pick<Deps, "db">,
  input: GetMessageInput,
): Promise<GetMessageOutput> => {
  const row = await deps.db.read((connection) => selectMessage(connection, input.id));
  return { id: row.id, body: row.body, createdAt: row.createdAt.toISOString() };
};
