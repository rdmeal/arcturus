// The example service's direct inserts and reads, for what its API can't
// arrange or show (docs/patterns/service-api-test.md rule 13).
import { addJob, sql } from "@arcturus/service-runtime";
import type { TestDatabase } from "@arcturus/service-testing";
import { connectionOf } from "@arcturus/service-testing/direct-db";
import { z } from "zod";

import type { DeliverMessagePayload } from "../messaging/deliver-message/schemas.ts";
import { deliverMessageTask } from "../messaging/deliver-message/task.ts";

/** Queues a delivery job, as a job run again after a crash would be. */
export const queueDeliverMessage = (
  db: TestDatabase,
  payload: DeliverMessagePayload,
): Promise<void> =>
  connectionOf(db).transaction((connection) => addJob(connection, deliverMessageTask, payload));

/** The number of jobs still queued, including those waiting to retry. */
export const countQueuedJobs = (db: TestDatabase): Promise<number> =>
  connectionOf(db).read((connection) =>
    connection.oneFirst(sql.type(z.object({ count: z.number() }))`
      select count(*)::int as count from graphile_worker.jobs
    `),
  );
