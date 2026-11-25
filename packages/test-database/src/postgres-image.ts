import { execFileSync } from "node:child_process";

import { z } from "zod";

const composeConfigSchema = z.object({
  services: z.object({ postgres: z.object({ image: z.string() }) }),
});

// A version tag, then a digest, as docs/adr/0020-guard-the-dependency-supply-chain.md requires.
const pinnedImage = /^postgres:[\w.-]+@sha256:[0-9a-f]{64}$/u;

/**
 * The Postgres image `compose.yaml` pins, read through Compose's own parser so
 * that the image has one home.
 */
export const readPostgresImage = (repositoryRoot: string): string => {
  const stdout = execFileSync("docker", ["compose", "config", "--format", "json"], {
    cwd: repositoryRoot,
    encoding: "utf8",
  });
  const { image } = composeConfigSchema.parse(JSON.parse(stdout)).services.postgres;
  if (!pinnedImage.test(image)) {
    throw new Error(`compose.yaml must pin the postgres image by version and digest, got ${image}`);
  }
  return image;
};
