import { createServiceApp } from "@arcturus/service-runtime";
import { describe, expect } from "vite-plus/test";

import { createServiceTest } from "./create-service-test.ts";

const test = createServiceTest({
  parseConfig: () => ({}),
  testConfig: {},
  createApp: ({ clock }) =>
    createServiceApp().get("/now", (c) => c.json({ now: clock.now().toISOString() })),
});

describe("clock", () => {
  test("the clock starts at 2030-01-01T00:00:00Z", async ({ client }) => {
    const response = await client.now.$get();

    expect(await response.json()).toStrictEqual({ now: "2030-01-01T00:00:00.000Z" });
  });

  test("set changes what the service reads as now", async ({ client, clock }) => {
    clock.set("2031-06-01T12:00:00Z");

    const response = await client.now.$get();

    expect(await response.json()).toStrictEqual({ now: "2031-06-01T12:00:00.000Z" });
  });

  test("advance moves what the service reads as now forward", async ({ client, clock }) => {
    clock.advance(90_000);

    const response = await client.now.$get();

    expect(await response.json()).toStrictEqual({ now: "2030-01-01T00:01:30.000Z" });
  });
});
