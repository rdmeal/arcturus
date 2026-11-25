import { Hono } from "hono";

import type { Deps } from "../app.ts";
import { getMessageRoute } from "./get-message/route.ts";
import { sendMessageRoute } from "./send-message/route.ts";

// oxlint-disable-next-line typescript/explicit-module-boundary-types -- a Hono app's type is its routes, inferred so the RPC client follows them
export const messagingRouter = (deps: Deps) => {
  return new Hono().route("/", sendMessageRoute(deps)).route("/", getMessageRoute(deps));
};
