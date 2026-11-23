import { describe, expect } from "vite-plus/test";
import { test } from "./test/test.ts";

describe("GET /health/live", () => {
  test("answers that the service is live", async ({ client }) => {
    const response = await client.health.live.$get();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "live" });
  });
});
