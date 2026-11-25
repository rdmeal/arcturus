// Vitest's root `globalSetup` (in vite.config.ts): one Postgres container for
// the whole run, shared by every package's tests
// (docs/adr/0034-run-test-databases-in-testcontainers.md).
import { fileURLToPath } from "node:url";

import { PostgreSqlContainer } from "@testcontainers/postgresql";
import type { TestProject } from "vite-plus/test/node";

import { readPostgresImage } from "./postgres-image.ts";
import type { TestDatabaseServer } from "./provided-context.ts";

const repositoryRoot = fileURLToPath(new URL("../../..", import.meta.url));

// Ryuk removes the run's containers if the run is killed. Its image is pinned by
// digest like every other image (docs/adr/0020-guard-the-dependency-supply-chain.md),
// at the version this Testcontainers release defaults to. Testcontainers reads it
// when it first starts a container.
const ryukImage =
  "testcontainers/ryuk:0.14.0@sha256:7c1a8a9a47c780ed0f983770a662f80deb115d95cce3e2daa3d12115b8cd28f0";

export const setup = async (project: TestProject): Promise<() => Promise<void>> => {
  process.env.RYUK_CONTAINER_IMAGE = ryukImage;
  const image = readPostgresImage(repositoryRoot);
  const container = await new PostgreSqlContainer(image).start();
  const server: TestDatabaseServer = {
    host: container.getHost(),
    port: container.getPort(),
    username: container.getUsername(),
    password: container.getPassword(),
  };
  project.provide("testDatabaseServer", server);
  return async () => {
    await container.stop();
  };
};
