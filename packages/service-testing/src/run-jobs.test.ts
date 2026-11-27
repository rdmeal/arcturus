import {
  addJob,
  ConflictError,
  createServiceApp,
  createTaskList,
  defineTask,
  sql,
} from "@arcturus/service-runtime";
import type { Database, TaskDefinition } from "@arcturus/service-runtime";
import { describe, expect } from "vite-plus/test";
import { z } from "zod";

import { createServiceTest } from "./create-service-test.ts";

interface Deps {
  db: Database;
  ran: string[];
}

const outcomePayload = z.object({
  outcome: z.enum(["succeed", "fail", "domain-error", "queue-another"]),
});

const outcomeTask: TaskDefinition<Deps, z.input<typeof outcomePayload>> = defineTask(
  "testing.outcome",
  outcomePayload,
  async (deps: Deps, { outcome }) => {
    deps.ran.push(outcome);
    if (outcome === "fail") {
      throw new Error("the job went wrong");
    }
    if (outcome === "domain-error") {
      throw new ConflictError("already-done", "This was already done.");
    }
    if (outcome === "queue-another") {
      await deps.db.transaction((connection) =>
        addJob(connection, outcomeTask, { outcome: "succeed" }),
      );
    }
  },
);

const queuedJob = z.object({ attempts: z.number() });

const createApp = (deps: Deps) =>
  createServiceApp({ db: deps.db })
    .post("/queue/:outcome", async (c) => {
      const payload = outcomePayload.parse({ outcome: c.req.param("outcome") });
      await deps.db.transaction((connection) => addJob(connection, outcomeTask, payload));
      return c.json({ queued: true });
    })
    .get("/ran", (c) => c.json({ ran: deps.ran }))
    .get("/queued", async (c) => {
      const jobs = await deps.db.read((connection) =>
        connection.any(sql.type(queuedJob)`select attempts from graphile_worker.jobs`),
      );
      return c.json({ jobs });
    });

const test = createServiceTest({
  parseConfig: () => ({}),
  testConfig: {},
  // Only services have migrated templates, and every template has graphile-worker's schema.
  database: "example",
  createDeps: ({ db }): Deps => ({ db, ran: [] }),
  createApp,
  createTaskList: (deps) => createTaskList([outcomeTask], deps),
});

describe("runJobs", () => {
  test("runs queued jobs until none can run", async ({ client, runJobs }) => {
    await client.queue[":outcome"].$post({ param: { outcome: "queue-another" } });

    await runJobs();

    const response = await client.ran.$get();
    expect(await response.json()).toStrictEqual({ ran: ["queue-another", "succeed"] });
  });

  test("fails the test when a job throws anything other than a domain error", async ({
    client,
    runJobs,
  }) => {
    await client.queue[":outcome"].$post({ param: { outcome: "fail" } });

    await expect(runJobs()).rejects.toThrow(/testing\.outcome.*the job went wrong/u);
  });

  test("with allowFailures, leaves the failed job to retry", async ({ client, runJobs }) => {
    await client.queue[":outcome"].$post({ param: { outcome: "fail" } });

    await runJobs({ allowFailures: true });

    const response = await client.queued.$get();
    expect(await response.json()).toStrictEqual({ jobs: [{ attempts: 1 }] });
  });

  test("a domain error doesn't fail the test", async ({ client, runJobs }) => {
    await client.queue[":outcome"].$post({ param: { outcome: "domain-error" } });

    await runJobs();

    const response = await client.queued.$get();
    expect(await response.json()).toStrictEqual({ jobs: [] });
  });
});
