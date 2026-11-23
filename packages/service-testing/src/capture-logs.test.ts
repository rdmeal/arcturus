import { createServiceApp, log } from "@arcturus/service-runtime";
import { describe, expect } from "vite-plus/test";

import { createServiceTest } from "./create-service-test.ts";

const test = createServiceTest({
  parseConfig: () => ({}),
  testConfig: {},
  createApp: () =>
    createServiceApp().get("/marked", (c) => {
      log.info({ marker: c.req.query("marker") }, "marked");
      return c.json({ ok: true });
    }),
});

describe("captureLogs", () => {
  test("a test that logs without capturing", async ({ client }) => {
    const response = await client.marked.$get({ query: { marker: "earlier-test" } });

    expect(response.status).toBe(200);
  });

  test("captureLogs returns only the records written during its own test", async ({
    client,
    captureLogs,
  }) => {
    await client.marked.$get({ query: { marker: "this-test" } });

    expect(captureLogs().map((record) => [record["msg"], record["marker"]])).toStrictEqual([
      ["marked", "this-test"],
      ["request completed", undefined],
    ]);
  });
});
