import type { Network } from "@arcturus/service-testing";
import { http, HttpResponse } from "msw";

import { receiveMessageRequest } from "./inbox.ts";
import type { ReceiveMessageRequest } from "./inbox.ts";

// Any host, so the handlers don't depend on the test config's DELIVERY_URL.
const receiveMessagePath = "*/inbox/receive-message";

const noContent = 204;

const received = (): Response => new HttpResponse(null, { status: noContent });

export const receiveMessageHandler = http.post(receiveMessagePath, received);

export const inboxHandlers = [receiveMessageHandler];

/**
 * Answers the inbox's receive-message endpoint with `response` (by default, as
 * the inbox does), and records each request body it receives.
 */
export const mockReceiveMessage = (
  network: Network,
  response: (request: ReceiveMessageRequest) => Response = received,
): { readonly requests: readonly ReceiveMessageRequest[] } => {
  const requests: ReceiveMessageRequest[] = [];
  network.use(
    http.post(receiveMessagePath, async ({ request }) => {
      const body = receiveMessageRequest.parse(await request.json());
      requests.push(body);
      return response(body);
    }),
  );
  return { requests };
};
