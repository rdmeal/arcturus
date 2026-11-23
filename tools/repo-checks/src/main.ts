import { fileURLToPath } from "node:url";

import { checkCurrentMigrations } from "./current-migration.ts";

const root = fileURLToPath(new URL("../../..", import.meta.url));

const checks = [checkCurrentMigrations];

const results = await Promise.all(checks.map((check) => check(root)));
const failures = results.flat();

for (const failure of failures) {
  console.error(failure);
}

if (failures.length > 0) {
  process.exitCode = 1;
} else {
  console.log("Repo checks passed.");
}
