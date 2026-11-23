---
type: plan
---

# Plan 02: Lint enforces the testing and production-code boundaries

Implements [ticket 02](../tickets/02-lint-enforces-testing-boundaries.md), part of [the spec](../spec.md).

## Context

- **Test boundary:** `vp check`, from the spec's "guard rails". Each rule is shown to fail once on a deliberate violation in `services/example`, which is then reverted (step 6). The `disable-needs-reason` rule also has its own unit tests, because it is code and not configuration.
- **ADRs:**
  - [0017: Build, test, lint and format with Vite+](../../../../docs/adr/0017-build-test-lint-and-format-with-vite-plus.md): the guard rails are Oxlint rules in the root `vite.config.ts` `lint` block. `denyWarnings` is already on.
  - [0020: Guard the dependency supply chain](../../../../docs/adr/0020-guard-the-dependency-supply-chain.md): no new dependency is planned. If one turns out to be needed, it passes the release-age and trust checks.
- **Patterns:**
  - [service-api-test](../../../../docs/patterns/service-api-test.md): rule 2 (where test-only code lives), rule 3 (production code never imports it), rule 6 (no hooks), rule 12 (no snapshots) and rule 13 (the `direct-db` escape hatch). Each lint message points to the rule it enforces.
- **Planning decisions:**
  - **Native Oxlint covers four of the five rules.** A throwaway probe against the repo's Oxlint 1.93 (not committed) found:
    - `no-restricted-imports` with `patterns[].group` matches relative imports with or without `.ts`, plus `msw`, `fishery`, `@testcontainers/*` and `@arcturus/service-testing`, and shows `message` as the help text.
    - A later `overrides` entry replaces an earlier one's rule options for the files it matches, so test files can swap the production ban for a direct-db-only ban.
    - `vitest/no-hooks` and `vitest/no-restricted-matchers` work, including `toThrowErrorMatchingSnapshot` and `toThrowErrorMatchingInlineSnapshot`. The snapshot criterion is therefore enforced, not merely recorded.
    - `options.reportUnusedDisableDirectives: "error"` reports a directive that suppresses nothing.
    - A disable comment with `-- <reason>` suppresses the rule as expected.
  - **The reason check is a local Oxlint JS plugin rule, `arcturus/disable-needs-reason`,** and not `@eslint-community/eslint-plugin-eslint-comments` or a `tools/` script. The probe showed that a ~20-line plugin registered through `jsPlugins` sees `oxlint-disable` comments via `context.sourceCode.getAllComments()`. It adds no dependency and runs wherever `vp check` runs: pre-commit, CI and the editor. As far as we know, the eslint-comments plugin only parses `eslint-*` directives (not verified).
  - **The plugin is a workspace package**, `tools/lint-rules` (`@arcturus/lint-rules`). It is written in `.ts` if Oxlint loads a `.ts` plugin through Node's type stripping. Otherwise it is `.js` with `// @ts-check` and JSDoc types, and the reason goes in this plan's Notes.
  - **Reason format:** an `oxlint-` or `eslint-` `disable`/`enable` directive (plain, `-line` or `-next-line`) must contain `--` followed by at least one non-space character.
  - **Production code** is every linted `.ts` file except test-only code as service-api-test rule 2 defines it: `**/*.test.ts`, `**/test/**`, `**/*.handlers.ts` and `packages/service-testing/**`. The production ban applies to all `**/*.ts`. A later override for the test-only globs replaces it with the direct-db ban plus the vitest rules.
  - **Setting `plugins` replaces Oxlint's defaults,** so the list must keep `unicorn`, `typescript` and `oxc` alongside `vitest`.
  - **Lint has its own contributor guide,** `docs/develop/linting.md`. It is the home of "every disable comment states its reason" and the list of guard rails, and it is linked from wherever it's relevant.

## Steps

- [x] **1. Ban test code and test libraries from production code**
  - **Goal:** a non-test `.ts` file that imports test-only code or a test library fails `vp check`, with a message pointing to service-api-test rule 3. The repo stays green, since no production file imports any of them today.
  - **Files:** `vite.config.ts`: in `lint`, add `overrides`:
    - one override for `**/*.ts` with `no-restricted-imports` → `patterns`:
      - a group for test-only paths (`**/test/**`, `*.test`, `*.test.ts`, `**/*.test`, `**/*.test.ts`, `*.handlers`, `*.handlers.ts`, `**/*.handlers`, `**/*.handlers.ts`);
      - a group for libraries (`@arcturus/service-testing`, `@arcturus/service-testing/*`, `msw`, `msw/*`, `fishery`, `@testcontainers/*`).
      - Each group's message names the rule and links `docs/patterns/service-api-test.md`, for example "Production code never imports test-only code (service-api-test rule 3: docs/patterns/service-api-test.md)".
    - one override for the test-only globs (`**/*.test.ts`, `**/test/**`, `**/*.handlers.ts`, `packages/service-testing/**`) that turns `no-restricted-imports` `off`. Step 2 replaces it with the direct-db ban.
  - **Read first:** [service-api-test](../../../../docs/patterns/service-api-test.md) rules 2 and 3. If `vite.config.ts`'s `lint` type rejects `overrides`, check how Vite+ 1.6 passes Oxlint config through (context7 or the `vite-plus` types in `node_modules`).
  - **Tests:** none committed. Before committing, temporarily add `import "msw";` and `import "./test/test.ts";` to `services/example/src/app.ts`, see `vp check` fail with the rule 3 message, then revert.
  - **Check:** `vp check`

- [x] **2. Forbid test hooks, snapshot matchers and unexplained direct-db imports in test files**
  - **Goal:** in test-only files, a `beforeAll`/`beforeEach`/`afterEach`/`afterAll`, a snapshot matcher or an import of `direct-db` fails `vp check`. Messages point to rules 6, 12 and 13. The repo stays green.
  - **Files:** `vite.config.ts`:
    - `lint.plugins` becomes `["unicorn", "typescript", "oxc", "vitest"]`.
    - The test-only override from step 1 now sets:
      - `no-restricted-imports` with one pattern group (`**/direct-db`, `**/direct-db.ts`), whose message says to add a disable comment explaining why the API can't reach the state (rule 13, with a link);
      - `vitest/no-hooks`: `error`;
      - `vitest/no-restricted-matchers` with `toMatchSnapshot`, `toMatchInlineSnapshot`, `toThrowErrorMatchingSnapshot` and `toThrowErrorMatchingInlineSnapshot`, each with a rule 12 message.
    - `vitest/no-hooks` has a fixed message, so rule 6 can't appear in it. The guide written in step 5 maps it to rule 6.
    - Adding the `vitest` plugin may enable rules from its default category on existing tests (for example `prefer-snapshot-hint` showed up in the probe). Fix or turn off anything that fires, and record what was turned off in Notes.
  - **Read first:** [service-api-test](../../../../docs/patterns/service-api-test.md) rules 6, 12 and 13.
  - **Tests:** none committed. Before committing, temporarily add a `beforeEach`, an `expect(x).toMatchSnapshot()` and an `import … from "./test/direct-db.ts"` to `services/example/src/health.test.ts`, see each fail, then revert.
  - **Check:** `vp check`

- [x] **3. Fail on disable comments that no longer suppress anything**
  - **Goal:** an unused `oxlint-disable…` or `eslint-disable…` directive fails `vp check`.
  - **Files:** `vite.config.ts`: `lint.options.reportUnusedDisableDirectives: "error"`.
  - **Read first:** none
  - **Tests:** none committed. Temporarily add `// oxlint-disable-next-line no-debugger -- probe` above a line in `services/example/src/app.ts`, see "Unused oxlint-disable directive", then revert.
  - **Check:** `vp check`

- [ ] **4. Require a reason on every disable comment, with a local lint rule**
  - **Goal:** `@arcturus/lint-rules` provides `arcturus/disable-needs-reason`, has unit tests, and is wired into `vp check`. Any directive without `-- <reason>` fails. The repo stays green.
  - **Files:**
    - `tools/lint-rules/package.json`: `@arcturus/lint-rules`, private, `"type": "module"`, `exports` pointing at source, `@types/node` as a dev dependency like the other packages.
    - `tools/lint-rules/tsconfig.json`: extends `tsconfig.base.json`.
    - `tools/lint-rules/src/index.ts`: the plugin's default export `{ meta: { name: "arcturus" }, rules: { "disable-needs-reason": disableNeedsReason } }`.
    - `tools/lint-rules/src/disable-needs-reason.ts`:
      - `disableNeedsReason`, a rule whose `create(context)` visits `Program`, reads `context.sourceCode.getAllComments()` and reports every directive comment without a reason;
      - the message points to `docs/develop/linting.md`;
      - a pure exported helper, `isDirectiveWithoutReason(commentText: string): boolean`, holds the regexes so they can be unit-tested.
    - `vite.config.ts`: `lint.jsPlugins: ["./tools/lint-rules/src/index.ts"]`, and `rules: { "arcturus/disable-needs-reason": "error" }`.
    - Do this first: check that Oxlint 1.93 loads a `.ts` plugin path through `vp check`. If it doesn't, rename to `.js` with `// @ts-check` and JSDoc types, and note why.
    - Type the rule with Oxlint's plugin types if `@oxlint/plugins` exports them (it's already in `node_modules` through Vite+). Otherwise use a minimal local type.
    - `pnpm-lock.yaml`: updated by `vp install` for the new workspace package.
  - **Read first:** `.claude/rules/typescript.md`, and `.claude/rules/tests.md` for the test file. [codebase](../../../../docs/develop/codebase.md) (`tools/` is never imported by services or games).
  - **Tests:** `tools/lint-rules/src/disable-needs-reason.test.ts`, with one `describe("isDirectiveWithoutReason")`:
    - "rejects a disable-next-line directive with no reason"
    - "accepts a directive with `-- <reason>`"
    - "rejects `--` with nothing after it"
    - "covers oxlint- and eslint- disable, enable, -line and -next-line forms"
    - "ignores ordinary comments that mention oxlint-disable mid-sentence"
    - Import Vitest APIs from `vite-plus/test`, as plan 01 settled. Also, before committing, temporarily remove a reason from a disable comment and see `vp check` fail, then revert.
  - **Check:** `vp install && vp test tools/lint-rules/src/disable-needs-reason.test.ts && vp check`

- [ ] **5. Document lint in a contributor guide**
  - **Goal:** `docs/develop/linting.md` is the home of the repo-wide rule that every disable comment states its reason, and lists each guard rail with the pattern rule it enforces. Other docs link to it.
  - **Files:**
    - `docs/develop/linting.md` (`type: guide`), for contributors:
      - where lint is configured (`vite.config.ts`, run by `vp check`);
      - every disable comment has the form `// oxlint-disable-next-line <rule> -- <reason>`, and an unused one fails;
      - a table of the guard rails: rule → what it stops → the pattern rule (service-api-test rules 3, 6, 12 and 13), including that `vitest/no-hooks` enforces rule 6;
      - where custom rules live (`tools/lint-rules`).
    - `docs/develop/README.md`: list the new guide.
    - `docs/develop/codebase.md`: in "What may import what", the production-code bullet also links `linting.md` for the enforcement. In the Layout or `tools/` description, mention `tools/lint-rules` only if the table needs it.
    - `docs/develop/tech-stack.md`: the Toolchain row links `linting.md` if the table has room for guides. Otherwise leave it.
    - `docs/patterns/service-api-test.md`: rules 3 and 13 say "a lint rule enforces this" or "lint forbids". Link those phrases to `linting.md` without restating it.
    - `.claude/rules/typescript.md`: one line, "Every lint disable comment states its reason: see `docs/develop/linting.md`."
  - **Read first:** `docs/develop/writing-docs.md`; load the `writing-docs` skill.
  - **Tests:** none
  - **Check:** `vp check` (formats and lints Markdown too)

- [ ] **6. Show each rule failing once on a deliberate violation**
  - **Goal:** an on-record demonstration, for the acceptance criteria, that every guard rail fails `vp check`. The tree ends unchanged.
  - **Files:** temporary edits only, all reverted, and this plan's Notes. In `services/example`, one at a time:
    1. `app.ts` imports `./test/test` (no extension), `./test/test.ts`, a `./x.handlers` path, `@arcturus/service-testing`, `msw`, `fishery` and `@testcontainers/postgresql`;
    2. `health.test.ts` imports `./test/direct-db.ts` with no disable comment;
    3. `health.test.ts` uses `beforeEach`;
    4. `health.test.ts` uses `toMatchSnapshot`, `toMatchInlineSnapshot`, `toThrowErrorMatchingSnapshot` and `toThrowErrorMatchingInlineSnapshot`;
    5. a disable comment with no `-- <reason>`;
    6. a disable comment that suppresses nothing.
    - Imports of modules that don't exist may also raise type errors. That's fine, as long as the lint error is there.
  - **Read first:** none
  - **Tests:** none committed. Paste the trimmed `vp check` error line for each case into Notes, dated.
  - **Check:** `git status --short services/` is clean afterwards, and `vp check` passes.

**7. Acceptance criteria**, checked at the test boundary (`vp check`):

- [ ] A non-test file that imports a test file, anything under a `test/` folder, a `*.handlers` module, `@arcturus/service-testing`, `msw`, `fishery` or `@testcontainers/*` fails `vp check`. Relative imports match with or without the `.ts` extension: proven by step 6 case 1, recorded in Notes, with the config from step 1 in `vite.config.ts`
- [ ] A test file that imports a service's `direct-db` module fails `vp check`, with a message pointing to the service API test pattern: proven by step 6 case 2
- [ ] A test hook in a `*.test.ts` file fails `vp check`: proven by step 6 case 3
- [ ] `toMatchSnapshot`, `toMatchInlineSnapshot` and the snapshot forms of `toThrowError…` fail `vp check`. Oxlint supports banning matchers natively (`vitest/no-restricted-matchers`), so this is enforced: proven by step 6 case 4
- [ ] A disable comment with no `-- <reason>` fails `vp check`, and so does a disable comment that no longer suppresses anything: proven by `disable-needs-reason.test.ts` in `tools/lint-rules/src/`, and by step 6 cases 5 and 6
- [ ] Each rule above was shown to fail once on a deliberate violation, which was then reverted: step 6's Notes entry
- [ ] The repo-wide rule that every disable comment states its reason has a home in the contributor docs, and the TypeScript rule for Claude points to it in one line: `docs/develop/linting.md` and `.claude/rules/typescript.md` (step 5)

## Notes

- 2026-11-23: Inside Claude's sandbox, a bare `vp check` fails on the sandbox-only placeholder files at the repo root (`.claude/loop.md` and others). Run `vp check vite.config.ts services packages tools docs specs` there instead. Outside the sandbox, `vp check` works as written.
- 2026-11-23: Adding the `vitest` plugin turned on two of its default rules that fired on existing tests:
  - `vitest/no-standalone-expect` flagged every `expect` inside the service's own `test` (built with `test.extend` and imported from `src/test/test.ts`). It is configured with `additionalTestBlockFunctions: ["test"]` in the test-only override.
  - `vitest/require-to-throw-message` flagged a bare `rejects.toThrow()` in `packages/service-runtime/src/server.test.ts`, which now asserts `"fetch failed"`.
  - Step 5's guide should mention the `additionalTestBlockFunctions` setting, so nobody removes it.
