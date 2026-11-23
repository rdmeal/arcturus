import { describe, expect } from "vite-plus/test";

import { test } from "./test/test.ts";

const DEBUG = 20;

describe("request log", () => {
  test("a health check is logged once, at debug, with method, matched route, status and duration", async ({
    client,
    captureLogs,
  }) => {
    await client.health.live.$get();

    const lines = captureLogs().filter((record) => record["msg"] === "request completed");
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({
      level: DEBUG,
      method: "GET",
      route: "/health/live",
      status: 200,
    });
    expect(lines[0]?.["durationMs"]).toBeTypeOf("number");
  });
});
