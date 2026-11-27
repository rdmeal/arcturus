import type { Deps } from "../../app.ts";
import { selectReceivedMessages } from "./queries.ts";
import type { ListReceivedMessagesOutput } from "./schemas.ts";

export const listReceivedMessages = async (
  deps: Pick<Deps, "db">,
): Promise<ListReceivedMessagesOutput> => {
  const rows = await deps.db.read((connection) => selectReceivedMessages(connection));
  return {
    messages: rows.map((row) => ({
      messageId: row.id,
      body: row.body,
      receivedAt: row.receivedAt.toISOString(),
    })),
  };
};
