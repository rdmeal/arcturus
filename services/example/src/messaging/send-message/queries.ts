import { sql } from "@arcturus/service-runtime";
import type { CommonQueryMethods } from "@arcturus/service-runtime";

export const insertMessage = async (
  connection: CommonQueryMethods,
  message: { id: string; body: string; createdAt: Date },
): Promise<void> => {
  await connection.query(sql.typeAlias("void")`
    insert into messages (id, body, created_at)
    values (${message.id}, ${message.body}, ${sql.timestamp(message.createdAt)})
  `);
};
