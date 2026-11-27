import { sql } from "@arcturus/service-runtime";
import type { CommonQueryMethods } from "@arcturus/service-runtime";
import { z } from "zod";

const receivedMessageRow = z.object({ id: z.uuid(), body: z.string(), receivedAt: z.date() });

export type ReceivedMessageRow = z.infer<typeof receivedMessageRow>;

export const selectReceivedMessages = (
  connection: CommonQueryMethods,
): Promise<readonly ReceivedMessageRow[]> =>
  connection.any(sql.type(receivedMessageRow)`
    select id, body, received_at as "receivedAt"
    from inbox_messages
    order by received_at, id
  `);
