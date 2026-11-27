import { HttpResponse } from "msw";
import { describe, expect } from "vite-plus/test";

import { mockReceiveMessage } from "../../clients/inbox/inbox.handlers.ts";
import { sendMessage } from "../../test/arrange.ts";
// oxlint-disable-next-line no-restricted-imports -- a repeated job, and whether a job is left to retry, can't be produced or seen through the API
import { countQueuedJobs, queueDeliverMessage } from "../../test/direct-db.ts";
import { problemDetailsFactory } from "../../test/factories/problem-details.factory.ts";
import { test } from "../../test/test.ts";

const WARN = 40;

const rejected = (): Response => {
  const problem = problemDetailsFactory.build();
  return HttpResponse.json(problem, { status: problem.status });
};

const unavailable = (): Response =>
  HttpResponse.json(problemDetailsFactory.build({ title: "Service Unavailable", status: 503 }), {
    status: 503,
  });

describe("messaging.deliver-message", () => {
  test("delivers a sent message to the inbox once", async ({ client, network, runJobs }) => {
    const inbox = mockReceiveMessage(network);
    const id = await sendMessage(client, { body: "Hello" });

    await runJobs();

    expect(inbox.requests).toStrictEqual([{ messageId: id, body: "Hello" }]);
    const response = await client.messaging["get-message"].$get({ query: { id } });
    expect(await response.json()).toMatchObject({ deliveredAt: "2030-01-01T00:00:00.000Z" });
  });

  test("a repeated delivery job for a delivered message sends nothing", async ({
    client,
    db,
    network,
    runJobs,
  }) => {
    const id = await sendMessage(client);
    await runJobs();
    const inbox = mockReceiveMessage(network);
    await queueDeliverMessage(db, { messageId: id });

    await runJobs();

    expect(inbox.requests).toStrictEqual([]);
  });

  test("a rejected delivery completes without retrying", async ({
    client,
    db,
    network,
    runJobs,
  }) => {
    const inbox = mockReceiveMessage(network, rejected);
    const id = await sendMessage(client);

    await runJobs();

    expect(inbox.requests).toHaveLength(1);
    expect(await countQueuedJobs(db)).toBe(0);
    const response = await client.messaging["get-message"].$get({ query: { id } });
    expect(await response.json()).toMatchObject({ deliveredAt: null });
  });

  test("logs a rejected delivery as a warning with its code", async ({
    client,
    network,
    runJobs,
    captureLogs,
  }) => {
    mockReceiveMessage(network, rejected);
    await sendMessage(client);

    await runJobs();

    const warnings = captureLogs().filter((record) => record["level"] === WARN);
    expect(warnings).toMatchObject([
      { code: "delivery-rejected", taskName: "messaging.deliver-message" },
    ]);
  });

  test("a failed delivery fails runJobs", async ({ client, network, runJobs }) => {
    mockReceiveMessage(network, unavailable);
    await sendMessage(client);

    await expect(runJobs()).rejects.toThrow(/messaging\.deliver-message.*503/u);
  });

  test("with allowFailures, a failed delivery is left to retry", async ({
    client,
    db,
    network,
    runJobs,
  }) => {
    mockReceiveMessage(network, unavailable);
    const id = await sendMessage(client);

    await runJobs({ allowFailures: true });

    expect(await countQueuedJobs(db)).toBe(1);
    const response = await client.messaging["get-message"].$get({ query: { id } });
    expect(await response.json()).toMatchObject({ deliveredAt: null });
  });

  test("log lines written by the job carry its job ID, task name and attempt", async ({
    client,
    runJobs,
    captureLogs,
  }) => {
    const id = await sendMessage(client);

    await runJobs();

    const delivered = captureLogs().find((record) => record["msg"] === "message delivered");
    expect(delivered).toMatchObject({
      messageId: id,
      taskName: "messaging.deliver-message",
      attempt: 1,
    });
    expect(delivered?.["jobId"]).toMatch(/^\d+$/u);
  });
});
