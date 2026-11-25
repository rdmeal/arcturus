import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";

import type { Deps } from "../../app.ts";
import { getMessage } from "./handler.ts";
import { getMessageInput, getMessageOutput } from "./schemas.ts";

const ok = 200;

// oxlint-disable-next-line typescript/explicit-module-boundary-types -- a Hono app's type is its routes, inferred so the RPC client follows them
export const getMessageRoute = (deps: Deps) => {
  return new Hono().get("/get-message", zValidator("query", getMessageInput), async (c) => {
    const output = await getMessage(deps, c.req.valid("query"));
    return c.json(getMessageOutput.parse(output), ok);
  });
};
