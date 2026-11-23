import { describe, expect, test } from "vite-plus/test";
import { z } from "zod";
import { ConfigError, logSettings, parseSettings } from "./settings.ts";

const schema = z.object({ ...logSettings });

describe("parseSettings", () => {
  test("defaults LOG_LEVEL to info and LOG_FORMAT to json when unset", () => {
    expect(parseSettings(schema, {})).toEqual({ LOG_LEVEL: "info", LOG_FORMAT: "json" });
  });

  test("rejects an invalid LOG_LEVEL with a readable message naming the setting", () => {
    const parse = () => parseSettings(schema, { LOG_LEVEL: "loud" });
    expect(parse).toThrow(ConfigError);
    expect(parse).toThrow(/LOG_LEVEL/);
  });

  test("rejects an invalid LOG_FORMAT with a readable message naming the setting", () => {
    const parse = () => parseSettings(schema, { LOG_FORMAT: "xml" });
    expect(parse).toThrow(ConfigError);
    expect(parse).toThrow(/LOG_FORMAT/);
  });
});
