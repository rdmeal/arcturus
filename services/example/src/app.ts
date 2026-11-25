import { createServiceApp } from "@arcturus/service-runtime";
import type { Clock, Database } from "@arcturus/service-runtime";

import type { Config } from "./config.ts";
import { messagingRouter } from "./messaging/router.ts";

export interface Deps {
  config: Config;
  db: Database;
  clock: Clock;
}

// oxlint-disable-next-line typescript/explicit-module-boundary-types -- a Hono app's type is its routes, inferred so the RPC client follows them
export const createApp = (deps: Deps) => {
  return createServiceApp({ db: deps.db }).route("/messaging", messagingRouter(deps));
};

export type AppType = ReturnType<typeof createApp>;
