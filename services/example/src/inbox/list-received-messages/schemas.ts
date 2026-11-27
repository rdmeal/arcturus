import { z } from "zod";

export const listReceivedMessagesOutput = z.object({
  messages: z.array(
    z.object({ messageId: z.uuid(), body: z.string(), receivedAt: z.iso.datetime() }),
  ),
});

export type ListReceivedMessagesOutput = z.infer<typeof listReceivedMessagesOutput>;
