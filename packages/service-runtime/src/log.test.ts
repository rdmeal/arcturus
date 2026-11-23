import { Writable } from "node:stream";
import { describe, expect, test } from "vite-plus/test";
import { configureLog, log } from "./log.ts";

function capture() {
  const chunks: string[] = [];
  const destination = new Writable({
    write(chunk, _encoding, callback) {
      chunks.push(String(chunk));
      callback();
    },
  });
  return { destination, output: () => chunks.join("") };
}

describe("configureLog", () => {
  test("writes JSON lines to the destination when the format is json", () => {
    const { destination, output } = capture();
    configureLog({ level: "info", format: "json", destination });

    log.info({ matchId: "m1" }, "Hello");

    expect(JSON.parse(output())).toMatchObject({ msg: "Hello", matchId: "m1" });
  });

  test("writes pretty lines when the format is pretty", () => {
    const { destination, output } = capture();
    configureLog({ level: "info", format: "pretty", destination });

    log.info({ matchId: "m1" }, "Hello");

    expect(output()).toContain("Hello");
    expect(output()).not.toContain('"msg"');
  });

  test("drops records below the configured level", () => {
    const { destination, output } = capture();
    configureLog({ level: "warn", format: "json", destination });

    log.info("Quiet");
    log.warn("Loud");

    expect(output()).toContain("Loud");
    expect(output()).not.toContain("Quiet");
  });
});
