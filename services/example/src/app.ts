import { health } from "@arcturus/service-runtime";
import { Hono } from "hono";

import type { Config } from "./config.ts";

export interface Deps {
  config: Config;
}

// oxlint-disable-next-line typescript/explicit-module-boundary-types -- a Hono app's type is its routes, inferred so the RPC client follows them
export const createApp = (_deps: Deps) => {
  return new Hono().route("/health", health());
};

export type AppType = ReturnType<typeof createApp>;
