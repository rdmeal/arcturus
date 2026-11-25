import { z } from "zod";

export const sendMessageInput = z.object({ body: z.string().min(1) });

export type SendMessageInput = z.infer<typeof sendMessageInput>;

export const sendMessageOutput = z.object({ id: z.uuid() });

export type SendMessageOutput = z.infer<typeof sendMessageOutput>;
