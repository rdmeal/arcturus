import { createServiceApp } from "@arcturus/service-runtime";
import type { Clock, Database, WithProblemDetails, Worker } from "@arcturus/service-runtime";

import type { InboxClient } from "./clients/inbox/inbox.ts";
import type { Config } from "./config.ts";
import { inboxRouter } from "./inbox/router.ts";
import { messagingRouter } from "./messaging/router.ts";

export interface Deps {
  config: Config;
  db: Database;
  clock: Clock;
  inbox: InboxClient;
  worker: Worker;
}

// oxlint-disable-next-line typescript/explicit-module-boundary-types -- a Hono app's type is its routes, inferred so the RPC client follows them
export const createApp = (deps: Deps) => {
  return createServiceApp({ db: deps.db, worker: deps.worker })
    .route("/messaging", messagingRouter(deps))
    .route("/inbox", inboxRouter(deps));
};

export type AppType = WithProblemDetails<ReturnType<typeof createApp>>;
