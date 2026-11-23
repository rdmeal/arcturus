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

// Test-only code, as service-api-test rule 2 defines it.
const testOnlyFiles = [
  "**/*.test.ts",
  "**/test/**",
  "**/*.handlers.ts",
  "packages/service-testing/**",
];

const productionImportBans = {
  patterns: [
    {
      group: [
        "**/test/**",
        "*.test",
        "*.test.ts",
        "**/*.test",
        "**/*.test.ts",
        "*.handlers",
        "*.handlers.ts",
        "**/*.handlers",
        "**/*.handlers.ts",
      ],
      message:
        "Production code never imports test-only code (service-api-test rule 3: docs/patterns/service-api-test.md).",
    },
    {
      group: [
        "@arcturus/service-testing",
        "@arcturus/service-testing/*",
        "msw",
        "msw/*",
        "fishery",
        "@testcontainers/*",
      ],
      message:
        "Production code never imports test libraries (service-api-test rule 3: docs/patterns/service-api-test.md).",
    },
  ],
};

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
    // A later override replaces an earlier one's options for the files it matches.
    overrides: [
      {
        files: ["**/*.ts"],
        rules: { "no-restricted-imports": ["error", productionImportBans] },
      },
      {
        files: testOnlyFiles,
        rules: { "no-restricted-imports": "off" },
      },
    ],
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
