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

const testImportBans = {
  patterns: [
    {
      group: ["**/direct-db", "**/direct-db.ts"],
      message:
        "Reach this state through the API. If it can't be reached that way, add a disable comment saying why (service-api-test rule 13: docs/patterns/service-api-test.md).",
    },
  ],
};

const noSnapshots =
  "Use explicit matchers, not snapshots (service-api-test rule 12: docs/patterns/service-api-test.md).";
const snapshotMatcherBans = {
  toMatchSnapshot: noSnapshots,
  toMatchInlineSnapshot: noSnapshots,
  toThrowErrorMatchingSnapshot: noSnapshots,
  toThrowErrorMatchingInlineSnapshot: noSnapshots,
};

export default defineConfig({
  fmt: {
    ignorePatterns,
    sortPackageJson: true,
  },
  lint: {
    ignorePatterns,
    // Listing plugins replaces Oxlint's defaults, so they are listed too.
    plugins: ["unicorn", "typescript", "oxc", "vitest"],
    jsPlugins: ["./tools/lint-rules/src/index.ts"],
    rules: { "arcturus/disable-needs-reason": "error" },
    options: {
      typeAware: true,
      typeCheck: true,
      // Oxlint reports most rules as warnings; fail `vp check` on them too.
      denyWarnings: true,
      reportUnusedDisableDirectives: "error",
    },
    // A later override replaces an earlier one's options for the files it matches.
    overrides: [
      {
        files: ["**/*.ts"],
        rules: { "no-restricted-imports": ["error", productionImportBans] },
      },
      {
        files: testOnlyFiles,
        rules: {
          "no-restricted-imports": ["error", testImportBans],
          // Service tests use the `test` their src/test/test.ts builds with `test.extend`.
          "vitest/no-standalone-expect": ["error", { additionalTestBlockFunctions: ["test"] }],
          "vitest/no-hooks": "error",
          "vitest/no-restricted-matchers": ["error", snapshotMatcherBans],
        },
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
