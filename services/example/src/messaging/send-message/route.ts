import { validateRequest } from "@arcturus/service-runtime";
import { Hono } from "hono";

import type { Deps } from "../../app.ts";
import { sendMessage } from "./handler.ts";
import { sendMessageInput, sendMessageOutput } from "./schemas.ts";

const created = 201;

// oxlint-disable-next-line typescript/explicit-module-boundary-types -- a Hono app's type is its routes, inferred so the RPC client follows them
export const sendMessageRoute = (deps: Deps) => {
  return new Hono().post("/send-message", validateRequest("json", sendMessageInput), async (c) => {
    const output = await sendMessage(deps, c.req.valid("json"));
    return c.json(sendMessageOutput.parse(output), created);
  });
};
