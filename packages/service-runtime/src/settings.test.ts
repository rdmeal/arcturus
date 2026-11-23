import { describe, expect, test } from "vite-plus/test";
import { z } from "zod";

import { ConfigError, logSettings, parseSettings } from "./settings.ts";

const schema = z.object({ ...logSettings });

const parseLoudLevel = () => parseSettings(schema, { LOG_LEVEL: "loud" });
const parseXmlFormat = () => parseSettings(schema, { LOG_FORMAT: "xml" });

describe("parseSettings", () => {
  test("defaults LOG_LEVEL to info and LOG_FORMAT to json when unset", () => {
    expect(parseSettings(schema, {})).toStrictEqual({ LOG_LEVEL: "info", LOG_FORMAT: "json" });
  });

  test("rejects an invalid LOG_LEVEL with a readable message naming the setting", () => {
    expect(parseLoudLevel).toThrow(ConfigError);
    expect(parseLoudLevel).toThrow(/LOG_LEVEL/u);
  });

  test("rejects an invalid LOG_FORMAT with a readable message naming the setting", () => {
    expect(parseXmlFormat).toThrow(ConfigError);
    expect(parseXmlFormat).toThrow(/LOG_FORMAT/u);
  });
});
