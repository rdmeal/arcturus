import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, test } from "vite-plus/test";

import { readPostgresImage } from "./postgres-image.ts";

const repositoryRoot = fileURLToPath(new URL("../../..", import.meta.url));

describe("readPostgresImage", () => {
  test("reads the digest-pinned postgres image from compose.yaml", async () => {
    const image = readPostgresImage(repositoryRoot);
    const compose = await readFile(join(repositoryRoot, "compose.yaml"), "utf8");

    expect(image).toMatch(/^postgres:[\w.-]+@sha256:[0-9a-f]{64}$/u);
    expect(compose).toContain(`image: ${image}`);
  });
});
