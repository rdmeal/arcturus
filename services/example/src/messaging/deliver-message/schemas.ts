import { z } from "zod";

export const deliverMessagePayload = z.object({ messageId: z.uuid() });

export type DeliverMessagePayload = z.infer<typeof deliverMessagePayload>;
