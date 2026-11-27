import { createServiceApp } from "@arcturus/service-runtime";
import { http, HttpResponse } from "msw";
import { describe, expect } from "vite-plus/test";
import { z } from "zod";

import { createServiceTest } from "./create-service-test.ts";

const greetingUrl = "http://neighbour.test/greeting";

const test = createServiceTest({
  parseConfig: () => ({}),
  testConfig: {},
  createDeps: (fixtures) => fixtures,
  createApp: () => createServiceApp(),
  handlers: [http.get(greetingUrl, () => HttpResponse.json({ greeting: "hello" }))],
});

const fetchGreeting = async (): Promise<string> => {
  const response = await fetch(greetingUrl);
  return z.object({ greeting: z.string() }).parse(await response.json()).greeting;
};

describe("network", () => {
  test("fails an outbound request that no handler matches", async () => {
    await expect(fetch("http://nowhere.test/thing")).rejects.toThrow(TypeError);
  });

  test("answers through a default handler", async () => {
    expect(await fetchGreeting()).toBe("hello");
  });

  test("a handler a test installs answers in place of the default", async ({ network }) => {
    network.use(http.get(greetingUrl, () => HttpResponse.json({ greeting: "hi" })));

    expect(await fetchGreeting()).toBe("hi");
  });

  test("a handler a test installs is gone in the next test", async () => {
    expect(await fetchGreeting()).toBe("hello");
  });
});
