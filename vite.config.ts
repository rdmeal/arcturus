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
  "packages/test-database/**",
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
        "@arcturus/test-database",
        "@arcturus/test-database/*",
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
    // Replaces Oxlint's `sort-imports`, which stays off (ADR 0047).
    sortImports: true,
  },
  lint: {
    ignorePatterns,
    // Listing plugins replaces Oxlint's defaults, so they are listed too.
    plugins: ["unicorn", "typescript", "oxc", "vitest", "import", "node", "promise"],
    jsPlugins: ["./tools/lint-rules/src/index.ts"],
    // `style`, `restriction` and `nursery` stay off as categories; their rules are picked by name (ADR 0047).
    categories: { correctness: "error", suspicious: "error", pedantic: "error", perf: "error" },
    rules: {
      "arcturus/disable-needs-reason": "error",
      // Library parameter types (Hono, Node) aren't readonly, so most findings can't be fixed.
      "typescript/prefer-readonly-parameter-types": "off",
      // Test `describe` blocks grow long by design; function size is judged in review.
      "eslint/max-lines-per-function": "off",
      // Picked from `restriction`:
      // `any` switches off type checking for everything it touches.
      "typescript/no-explicit-any": "error",
      // `!` asserts a value is there without checking; handle the missing case instead.
      "typescript/no-non-null-assertion": "error",
      // An exported function's inferred type can change by accident, and with it the package's API.
      "typescript/explicit-module-boundary-types": "error",
      // Services log through service-runtime's logger, so output is structured and traced.
      "eslint/no-console": "error",
      // Exits go through service-runtime's lifecycle, which lets output and telemetry flush.
      "unicorn/no-process-exit": "error",
      // Named exports keep one name per thing across imports, and refactor safely.
      "import/no-default-export": "error",
      // Picked from `style`:
      // A named constant says what a number means; 0, 1 and -1 rarely need one.
      "eslint/no-magic-numbers": [
        "error",
        {
          ignore: [0, 1, -1],
          ignoreDefaultValues: true,
          ignoreTypeIndexes: true,
          ignoreEnums: true,
          enforceConst: true,
        },
      ],
      // Braces on every block, so adding a line never changes what a condition covers.
      "eslint/curly": ["error", "all"],
      // One way to declare an object type; interfaces can be extended and read better in errors.
      "typescript/consistent-type-definitions": ["error", "interface"],
      // Named functions are `const` arrow functions, so there's one way to write them.
      "eslint/func-style": ["error", "expression"],
      // Tests use `test`, never `it`, matching the fixture-extended `test` services export.
      "vitest/consistent-test-it": ["error", { fn: "test", withinDescribe: "test" }],
      // Not picked: it flags the `test` a service's tests import from src/test/test.ts, and
      // TypeScript already rejects an un-imported `test` or `expect`, because no globals are enabled.
      "vitest/prefer-importing-vitest-globals": "off",
      // Test titles read as lowercase sentences; `describe` names a function or module as written.
      "vitest/prefer-lowercase-title": ["error", { ignore: ["describe"] }],
      // One `import type` line per module, rather than `type` mixed into a value import.
      "import/consistent-type-specifier-style": ["error", "prefer-top-level"],
      // `toEqual` ignores `undefined` properties and class types, so it can pass on the wrong value.
      "vitest/prefer-strict-equal": "error",
      // Nested ternaries are hard to read; use `if` or a lookup instead.
      "eslint/no-nested-ternary": "error",
      // `await` reads top to bottom and keeps errors in `try`/`catch`.
      "promise/prefer-await-to-then": "error",
      // Reading a member straight off an `await` hides the awaited value; name it first.
      "unicorn/no-await-expression-member": "error",
      // Property signatures are checked strictly; method signatures are bivariant.
      "typescript/method-signature-style": ["error", "property"],
      // One variable per `const` or `let`, so each reads and diffs on its own.
      "eslint/one-var": ["error", "never"],
      // Catch parameters are named `error`, the same everywhere.
      "unicorn/catch-error-name": "error",
      // Promise executors name their callbacks `resolve` and `reject`, so they read the same everywhere.
      "promise/param-names": "error",
    },
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
          // A test's numbers are its data (ADR 0047).
          "eslint/no-magic-numbers": "off",
        },
      },
      {
        // A service's direct-db module is the one place that reaches the `db`
        // fixture's database (service-api-test rule 13).
        files: ["**/src/test/direct-db.ts"],
        rules: { "no-restricted-imports": "off" },
      },
      {
        files: ["tools/**"],
        // Repository tools are command-line scripts that write to the terminal.
        rules: { "eslint/no-console": "off" },
      },
      {
        files: ["vite.config.ts", "tools/lint-rules/src/index.ts"],
        // Vite+ and Oxlint's JS plugin loader read these files' default export.
        rules: { "import/no-default-export": "off" },
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
    // One Postgres container for the whole run, shared by every project (ADR 0034).
    globalSetup: ["packages/test-database/src/global-setup.ts"],
  },
});
