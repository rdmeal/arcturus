import { z } from "zod";

export const getMessageInput = z.object({ id: z.uuid() });

export type GetMessageInput = z.infer<typeof getMessageInput>;

export const getMessageOutput = z.object({
  id: z.uuid(),
  body: z.string(),
  createdAt: z.iso.datetime(),
});

export type GetMessageOutput = z.infer<typeof getMessageOutput>;
