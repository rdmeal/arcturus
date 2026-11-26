import { describe, expect } from "vite-plus/test";

import { test } from "./test/test.ts";

describe("GET /health/ready", () => {
  test("answers ready with the service's database", async ({ client }) => {
    const response = await client.health.ready.$get();

    expect(response.status).toBe(200);
    expect(await response.json()).toStrictEqual({ status: "ready" });
  });
});
