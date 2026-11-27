import { Hono } from "hono";

import type { Deps } from "../../app.ts";
import { listReceivedMessages } from "./handler.ts";
import { listReceivedMessagesOutput } from "./schemas.ts";

const ok = 200;

// oxlint-disable-next-line typescript/explicit-module-boundary-types -- a Hono app's type is its routes, inferred so the RPC client follows them
export const listReceivedMessagesRoute = (deps: Deps) => {
  return new Hono().get("/list-received-messages", async (c) => {
    const output = await listReceivedMessages(deps);
    return c.json(listReceivedMessagesOutput.parse(output), ok);
  });
};
