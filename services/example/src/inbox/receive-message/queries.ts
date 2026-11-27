import { sql } from "@arcturus/service-runtime";
import type { CommonQueryMethods } from "@arcturus/service-runtime";

/** Stores a received message, unless a message with its ID is already stored. */
export const insertReceivedMessage = async (
  connection: CommonQueryMethods,
  message: { id: string; body: string; receivedAt: Date },
): Promise<void> => {
  await connection.query(sql.typeAlias("void")`
    insert into inbox_messages (id, body, received_at)
    values (${message.id}, ${message.body}, ${sql.timestamp(message.receivedAt)})
    on conflict (id) do nothing
  `);
};
