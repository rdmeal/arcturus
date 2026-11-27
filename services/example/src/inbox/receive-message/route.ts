import { validateRequest } from "@arcturus/service-runtime";
import { Hono } from "hono";

import type { Deps } from "../../app.ts";
import { receiveMessage } from "./handler.ts";
import { receiveMessageInput } from "./schemas.ts";

const noContent = 204;

// oxlint-disable-next-line typescript/explicit-module-boundary-types -- a Hono app's type is its routes, inferred so the RPC client follows them
export const receiveMessageRoute = (deps: Deps) => {
  return new Hono().post(
    "/receive-message",
    validateRequest("json", receiveMessageInput),
    async (c) => {
      await receiveMessage(deps, c.req.valid("json"));
      return c.body(null, noContent);
    },
  );
};
