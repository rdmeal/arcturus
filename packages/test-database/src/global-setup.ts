// Vitest's root `globalSetup` (in vite.config.ts): one Postgres container for
// the whole run, shared by every package's tests
// (docs/adr/0034-run-test-databases-in-testcontainers.md).
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { findMigrationPackages } from "@arcturus/workspace";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import type { TestProject } from "vite-plus/test/node";

import { buildTemplate, templateName } from "./build-template.ts";
import { readPostgresImage } from "./postgres-image.ts";
import type { TestDatabaseServer } from "./provided-context.ts";

const repositoryRoot = fileURLToPath(new URL("../../..", import.meta.url));

// Ryuk removes the run's containers if the run is killed. Its image is pinned by
// digest like every other image (docs/adr/0020-guard-the-dependency-supply-chain.md),
// at the version this Testcontainers release defaults to. Testcontainers reads it
// when it first starts a container.
const ryukImage =
  "testcontainers/ryuk:0.14.0@sha256:7c1a8a9a47c780ed0f983770a662f80deb115d95cce3e2daa3d12115b8cd28f0";

// A service's database name, which its tests pass to `createServiceTest`: the
// service's folder (`services/example` is `example`), or the game's for a game
// service (`games/<game>/service`), with hyphens as underscores.
const databaseName = (folder: string): string => {
  // `services/<name>` or `games/<game>/service`: the second segment either way.
  const [, name = ""] = folder.split("/");
  return name.replaceAll("-", "_");
};

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
  const services = await findMigrationPackages(repositoryRoot);
  await Promise.all(
    services.map((folder) =>
      buildTemplate({
        server,
        name: templateName(databaseName(folder)),
        migrationsFolder: join(repositoryRoot, folder, "migrations"),
      }),
    ),
  );
  project.provide("testDatabaseServer", server);
  return async () => {
    await container.stop();
  };
};
