import { spawnSync } from "node:child_process";
import { join } from "node:path";

import { findMigrationPackages } from "@arcturus/workspace";

// `status` validates its settings even with `--skipDatabase`, which never connects.
// Graphile Migrate rejects a main and shadow database with the same URL.
const placeholderDatabaseUrl = "postgres://placeholder@localhost/placeholder";
const placeholderShadowDatabaseUrl = "postgres://placeholder@localhost/placeholder_shadow";

/**
 * Fails each migration package whose `current.sql` holds more than comments,
 * using Graphile Migrate's own `status` check. Returns one message per failing package.
 */
export const checkCurrentMigrations = async (root: string): Promise<string[]> => {
  const packages = await findMigrationPackages(root);
  return packages
    .map((folder) => statusFailure(root, folder))
    .filter((failure) => failure !== null);
};

const statusFailure = (root: string, folder: string): string | null => {
  const result = spawnSync("vp", ["exec", "graphile-migrate", "status", "--skipDatabase"], {
    cwd: join(root, folder),
    encoding: "utf8",
    env: {
      ...process.env,
      DATABASE_URL: placeholderDatabaseUrl,
      SHADOW_DATABASE_URL: placeholderShadowDatabaseUrl,
    },
  });
  if (result.status === 0) {
    return null;
  }
  const output = result.error ? String(result.error) : `${result.stdout}${result.stderr}`.trim();
  return `${folder}: migrations/current.sql must hold only comments before merging (graphile-migrate status failed).\n${output}`;
};
