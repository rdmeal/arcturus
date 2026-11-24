import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { describe, expect, onTestFinished, test } from "vite-plus/test";

import { findMigrationPackages } from "./migration-packages.ts";

// Builds a throwaway repository holding the given files, each empty.
const repoWith = async (files: readonly string[]): Promise<string> => {
  const root = await mkdtemp(join(tmpdir(), "repo-checks-"));
  onTestFinished(async () => {
    await rm(root, { recursive: true, force: true });
  });
  await Promise.all(
    files.map(async (file) => {
      const path = join(root, file);
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, "");
    }),
  );
  return root;
};

describe("findMigrationPackages", () => {
  test("finds no packages when no service has a .gmrc", async () => {
    const root = await repoWith(["services/example/package.json"]);

    expect(await findMigrationPackages(root)).toStrictEqual([]);
  });

  test("finds services and game services that have a .gmrc", async () => {
    const root = await repoWith([
      "services/tournament-runner/.gmrc",
      "services/player-gateway/.gmrc",
      "games/poker/service/.gmrc",
    ]);

    expect(await findMigrationPackages(root)).toStrictEqual([
      "games/poker/service",
      "services/player-gateway",
      "services/tournament-runner",
    ]);
  });

  test("finds services whose configuration is a .gmrc.js or .gmrc.cjs", async () => {
    const root = await repoWith(["services/example/.gmrc.cjs", "games/poker/service/.gmrc.js"]);

    expect(await findMigrationPackages(root)).toStrictEqual([
      "games/poker/service",
      "services/example",
    ]);
  });

  test("ignores packages without a .gmrc", async () => {
    const root = await repoWith([
      "services/player-gateway/.gmrc",
      "services/example/package.json",
      "games/poker/agents/.gmrc",
      "packages/service-runtime/.gmrc",
    ]);

    expect(await findMigrationPackages(root)).toStrictEqual(["services/player-gateway"]);
  });
});
