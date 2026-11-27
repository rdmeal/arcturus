import { Hono } from "hono";

import type { Deps } from "../app.ts";
import { listReceivedMessagesRoute } from "./list-received-messages/route.ts";
import { receiveMessageRoute } from "./receive-message/route.ts";

// oxlint-disable-next-line typescript/explicit-module-boundary-types -- a Hono app's type is its routes, inferred so the RPC client follows them
export const inboxRouter = (deps: Deps) => {
  return new Hono()
    .route("/", receiveMessageRoute(deps))
    .route("/", listReceivedMessagesRoute(deps));
};
