import { health } from "@arcturus/service-runtime";
import { Hono } from "hono";
import type { Config } from "./config.ts";

export type Deps = { config: Config };

export function createApp(_deps: Deps) {
  return new Hono().route("/health", health());
}

export type AppType = ReturnType<typeof createApp>;
