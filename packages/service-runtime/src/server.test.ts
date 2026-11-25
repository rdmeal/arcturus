import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath } from "node:url";

import { describe, expect, onTestFinished, test } from "vite-plus/test";
import { z } from "zod";

const fixture = fileURLToPath(new URL("../test/fixtures/server.ts", import.meta.url));

const logLine = z.object({ msg: z.string(), port: z.number().optional() });

/** Spawns the fixture server and resolves once it logs `listening`. */
const startFixture = async ({ shutdownTimeoutMs }: { shutdownTimeoutMs: number }) => {
  const child = spawn(process.execPath, [fixture, String(shutdownTimeoutMs)], {
    stdio: ["ignore", "pipe", "inherit"],
  });
  onTestFinished(() => {
    child.kill("SIGKILL");
  });

  const exited = new Promise<{ code: number | null; signal: NodeJS.Signals | null }>((resolve) => {
    child.once("exit", (code, signal) => {
      resolve({ code, signal });
    });
  });

  // Every log message the fixture writes, in order.
  const messages: string[] = [];
  const port = await new Promise<number>((resolve, reject) => {
    let partial = "";
    child.stdout.on("data", (chunk) => {
      const lines = (partial + String(chunk)).split("\n");
      partial = lines.pop() ?? "";
      for (const line of lines) {
        const entry = logLine.safeParse(JSON.parse(line));
        if (entry.success) {
          messages.push(entry.data.msg);
          if (entry.data.msg === "listening" && entry.data.port !== undefined) {
            resolve(entry.data.port);
          }
        }
      }
    });
    child.once("exit", () => {
      reject(new Error("The fixture exited before it was listening"));
    });
  });

  return { child, port, url: `http://127.0.0.1:${port}`, exited, messages };
};

describe("startServer", () => {
  test("answers /health/live and /health/ready on a running server", async () => {
    const { url } = await startFixture({ shutdownTimeoutMs: 300 });

    const live = await fetch(`${url}/health/live`);
    const ready = await fetch(`${url}/health/ready`);

    expect(live.status).toBe(200);
    expect(await live.json()).toStrictEqual({ status: "live" });
    expect(ready.status).toBe(200);
    expect(await ready.json()).toStrictEqual({ status: "ready" });
  });

  test("completes a request in flight when SIGTERM arrives", async () => {
    const { child, url, exited } = await startFixture({ shutdownTimeoutMs: 1000 });

    const slow = fetch(`${url}/slow?ms=200`);
    await sleep(50);
    child.kill("SIGTERM");

    const response = await slow;
    expect(response.status).toBe(200);
    expect(await response.json()).toStrictEqual({ status: "done" });
    const { code } = await exited;
    expect(code).toBe(0);
  });

  test("refuses new connections after SIGTERM", async () => {
    const { child, url, exited } = await startFixture({ shutdownTimeoutMs: 1000 });

    const slow = fetch(`${url}/slow?ms=300`);
    await sleep(50);
    child.kill("SIGTERM");
    await sleep(100);

    await expect(fetch(`${url}/health/live`)).rejects.toThrow("fetch failed");
    await slow;
    const { code } = await exited;
    expect(code).toBe(0);
  });

  test("exits within the hard timeout when a request outlasts it", async () => {
    const { child, url, exited } = await startFixture({ shutdownTimeoutMs: 300 });

    // Settled from the start, so its rejection when the process exits is never unhandled.
    const slow = Promise.allSettled([fetch(`${url}/slow?ms=5000`)]);
    await sleep(50);
    const signalledAt = Date.now();
    child.kill("SIGTERM");

    const { code } = await exited;
    expect(code).toBe(1);
    expect(Date.now() - signalledAt).toBeLessThan(2000);
    const [outcome] = await slow;
    expect(outcome.status).toBe("rejected");
  });

  test("exits cleanly on SIGINT", async () => {
    const { child, exited } = await startFixture({ shutdownTimeoutMs: 300 });

    child.kill("SIGINT");

    const { code } = await exited;
    expect(code).toBe(0);
  });

  test("onClose runs after the server has closed", async () => {
    const { child, url, exited, messages } = await startFixture({ shutdownTimeoutMs: 1000 });

    const slow = fetch(`${url}/slow?ms=200`);
    await sleep(50);
    child.kill("SIGTERM");
    await slow;

    const { code } = await exited;
    expect(code).toBe(0);
    expect(messages.filter((msg) => msg !== "request completed").slice(-2)).toStrictEqual([
      "slow request finished",
      "onClose ran",
    ]);
  });
});
