import { sql } from "@arcturus/service-runtime";
import type { CommonQueryMethods } from "@arcturus/service-runtime";
import { z } from "zod";

const messageRow = z.object({ id: z.uuid(), body: z.string(), createdAt: z.date() });

export type MessageRow = z.infer<typeof messageRow>;

export const selectMessage = (
  connection: CommonQueryMethods,
  id: string,
): Promise<MessageRow | null> =>
  connection.maybeOne(sql.type(messageRow)`
    select id, body, created_at as "createdAt"
    from messages
    where id = ${id}
  `);
