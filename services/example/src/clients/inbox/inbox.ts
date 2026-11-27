import { RuleViolationError } from "@arcturus/service-runtime";
import { z } from "zod";

// The client's own view of the inbox's endpoint, as a client of another
// service would have, rather than the inbox slice's schema.
export const receiveMessageRequest = z.object({ messageId: z.uuid(), body: z.string() });

export type ReceiveMessageRequest = z.infer<typeof receiveMessageRequest>;

export interface InboxClient {
  /**
   * Posts a message to the inbox. A 4xx answer throws a domain error, because
   * sending the same message again can't succeed. Any other failure throws a
   * plain error, so the job sending it retries.
   */
  readonly receiveMessage: (request: ReceiveMessageRequest) => Promise<void>;
}

const lowestClientError = 400;
const lowestServerError = 500;

export const createInboxClient = (options: { url: string }): InboxClient =>
  Object.freeze({
    receiveMessage: async (request: ReceiveMessageRequest) => {
      const response = await fetch(options.url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(receiveMessageRequest.parse(request)),
      });
      await response.body?.cancel();
      if (response.ok) {
        return;
      }
      if (response.status >= lowestClientError && response.status < lowestServerError) {
        throw new RuleViolationError("delivery-rejected", "The inbox rejected the message.");
      }
      throw new Error(`The inbox answered ${response.status}`);
    },
  });
