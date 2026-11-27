import { z } from "zod";

export const receiveMessageInput = z.object({ messageId: z.uuid(), body: z.string().min(1) });

export type ReceiveMessageInput = z.infer<typeof receiveMessageInput>;
