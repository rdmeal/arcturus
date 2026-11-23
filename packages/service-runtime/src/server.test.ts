import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, onTestFinished, test } from "vite-plus/test";

const fixture = fileURLToPath(new URL("../test/fixtures/server.ts", import.meta.url));

/** Spawns the fixture server and resolves once it logs `listening`. */
async function startFixture({ shutdownTimeoutMs }: { shutdownTimeoutMs: number }) {
  const child = spawn(process.execPath, [fixture, String(shutdownTimeoutMs)], {
    stdio: ["ignore", "pipe", "inherit"],
  });
  onTestFinished(() => {
    child.kill("SIGKILL");
  });

  const exited = new Promise<{ code: number | null; signal: NodeJS.Signals | null }>((resolve) => {
    child.once("exit", (code, signal) => resolve({ code, signal }));
  });

  const port = await new Promise<number>((resolve, reject) => {
    let buffered = "";
    child.stdout.on("data", (chunk) => {
      buffered += String(chunk);
      for (const line of buffered.split("\n")) {
        try {
          const entry = JSON.parse(line) as { msg?: string; port?: number };
          if (entry.msg === "listening" && entry.port !== undefined) resolve(entry.port);
        } catch {
          // Not a complete JSON line yet.
        }
      }
    });
    void exited.then(() => reject(new Error("The fixture exited before it was listening")));
  });

  return { child, port, url: `http://127.0.0.1:${port}`, exited };
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("startServer", () => {
  test("answers /health/live and /health/ready on a running server", async () => {
    const { url } = await startFixture({ shutdownTimeoutMs: 300 });

    const live = await fetch(`${url}/health/live`);
    const ready = await fetch(`${url}/health/ready`);

    expect(live.status).toBe(200);
    expect(await live.json()).toEqual({ status: "live" });
    expect(ready.status).toBe(200);
    expect(await ready.json()).toEqual({ status: "ready" });
  });

  test("completes a request in flight when SIGTERM arrives", async () => {
    const { child, url, exited } = await startFixture({ shutdownTimeoutMs: 1000 });

    const slow = fetch(`${url}/slow?ms=200`);
    await sleep(50);
    child.kill("SIGTERM");

    const response = await slow;
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "done" });
    expect((await exited).code).toBe(0);
  });

  test("refuses new connections after SIGTERM", async () => {
    const { child, url, exited } = await startFixture({ shutdownTimeoutMs: 1000 });

    const slow = fetch(`${url}/slow?ms=300`);
    await sleep(50);
    child.kill("SIGTERM");
    await sleep(100);

    await expect(fetch(`${url}/health/live`)).rejects.toThrow();
    await slow;
    expect((await exited).code).toBe(0);
  });

  test("exits within the hard timeout when a request outlasts it", async () => {
    const { child, url, exited } = await startFixture({ shutdownTimeoutMs: 300 });

    const slow = fetch(`${url}/slow?ms=5000`).catch(() => undefined);
    await sleep(50);
    const signalledAt = Date.now();
    child.kill("SIGTERM");

    expect((await exited).code).toBe(1);
    expect(Date.now() - signalledAt).toBeLessThan(2000);
    await slow;
  });

  test("exits cleanly on SIGINT", async () => {
    const { child, exited } = await startFixture({ shutdownTimeoutMs: 300 });

    child.kill("SIGINT");

    expect((await exited).code).toBe(0);
  });
});
