import { sql } from "@arcturus/service-runtime";
import type { CommonQueryMethods } from "@arcturus/service-runtime";
import { z } from "zod";

const messageToDeliverRow = z.object({ body: z.string(), deliveredAt: z.date().nullable() });

export type MessageToDeliverRow = z.infer<typeof messageToDeliverRow>;

export const selectMessageToDeliver = (
  connection: CommonQueryMethods,
  id: string,
): Promise<MessageToDeliverRow | null> =>
  connection.maybeOne(sql.type(messageToDeliverRow)`
    select body, delivered_at as "deliveredAt"
    from messages
    where id = ${id}
  `);

/** Records when the message was delivered, unless that is already recorded. */
export const markDelivered = async (
  connection: CommonQueryMethods,
  message: { id: string; deliveredAt: Date },
): Promise<void> => {
  await connection.query(sql.typeAlias("void")`
    update messages
    set delivered_at = ${sql.timestamp(message.deliveredAt)}
    where id = ${message.id} and delivered_at is null
  `);
};
