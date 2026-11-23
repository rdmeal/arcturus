import { defineConfig } from "vite-plus";

// Same globs as `pnpm-workspace.yaml`.
const workspaceGlobs = [
  "apps/*",
  "services/*",
  "packages/*",
  "games/*/service",
  "games/*/agents",
  "tools/*",
];

const ignorePatterns = ["scratchpad/**"];

export default defineConfig({
  fmt: {
    ignorePatterns,
    sortPackageJson: true,
  },
  lint: {
    ignorePatterns,
    options: {
      typeAware: true,
      typeCheck: true,
      // Oxlint reports most rules as warnings; fail `vp check` on them too.
      denyWarnings: true,
    },
  },
  // Run by the pre-commit hook (`.vite-hooks/pre-commit`) on the staged files.
  staged: {
    "*": "vp check --fix",
  },
  test: {
    // Every workspace package is a Vitest project, named by its package name.
    projects: workspaceGlobs,
  },
});
