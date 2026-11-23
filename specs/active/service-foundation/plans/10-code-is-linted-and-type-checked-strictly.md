---
type: plan
---

# Plan 10: Code is linted and type-checked strictly

Implements [ticket 10](../tickets/10-code-is-linted-and-type-checked-strictly.md), part of [the spec](../spec.md).

## Context

- **Test boundary:** `vp check` over the repository itself. The ticket delivers no user story. Each kind of rule is shown to fail once on a deliberate violation, which is then reverted, as the spec's Testing section does for the other guard rails.
- **ADRs:**
  - [0047: Lint with Oxlint's strict categories, plus named picks](../../../../docs/adr/0047-lint-with-strict-categories-and-named-picks.md): the four categories as errors, `style` and `restriction` rules only by name with a one-line reason, rules inside a category turned off by name with a reason, and tests as strict as production code apart from `no-magic-numbers`.
  - [0048: Turn on the strictest TypeScript compiler options](../../../../docs/adr/0048-turn-on-the-strictest-typescript-compiler-options.md): the five options go in `tsconfig.base.json`, which every package's tsconfig extends.
  - [0046: Prefer established lint plugins, and write a local rule only when none fits](../../../../docs/adr/0046-prefer-established-lint-plugins-over-local-rules.md): no new plugin is needed, because `import`, `node` and `promise` are built into Oxlint.
- **Patterns:**
  - [service API tests](../../../../docs/patterns/service-api-test.md) and [service composition root](../../../../docs/patterns/service-composition-root.md): already updated for this rule set. Code fixed here must stay consistent with them (`toStrictEqual`, a `Deps` interface).
  - [child-process test](../../../../docs/patterns/child-process-test.md): the server tests that prove the shutdown change in step 4.
- **Measured on 2026-11-23, before planning:**
  - The five compiler options give 0 findings in the existing code. A probe file with an unchecked index read did fail.
  - `sortImports` reorders 14 files.
  - The full lint set gives 104 findings before any exceptions.
    - 18 are `prefer-readonly-parameter-types` and 1 is `max-lines-per-function`, both turned off.
    - About 25 come from the categories.
    - About 60 come from the named picks. Most magic numbers are in test-only files, which the test override clears.
- **Planning decisions:**
  - **`prefer-readonly-parameter-types` is off:** library parameter types (Hono, Node) aren't readonly.
  - **`max-lines-per-function` is off:** test `describe` blocks grow long by design, and function size is judged in review.
  - **Only the hard-timeout exit stays a `process.exit`:**
    - `process.exit` drops in-flight I/O. That includes piped stdout, which Node writes asynchronously, and the OTel exporter's flush on shutdown.
    - After a clean close, the server returns no exit. The event loop drains and Node exits 0 by itself. A leaked handle then shows up as a failed shutdown, because the hard timeout fires.
    - The hard timeout keeps `process.exit(1)`, with a disable comment, because that path exists for a loop that can't drain.
  - **Casts are removed, not disabled,** because a cast often hides a bug:
    - **`serve(...) as Server`:** build the server with `http.createServer(getRequestListener(app.fetch))` and narrow `server.address()`.
    - **`as never` on the config fixture:** pass a fixture function.
    - **`JSON.parse(...) as {...}` in the server test:** use zod's `safeParse`.
  - **`no-console` in `packages/service-testing`:** a disable comment with a reason, because only `tools/` relaxes that rule. The console sink is how Vitest attaches log lines to the running test.
  - **Checks in Claude's sandbox:** `vp check` can't start there, because the sandbox's placeholder dotfiles make the formatter fail before analysis.
    - Implementing sessions use `vp lint` (lint and type check), `vp fmt --check $(git ls-files '*.ts' '*.json' '*.md' '*.yaml')`, `vp test` and `vp run -r build`.
    - The developer runs `vp check` before committing each step.

## Steps

- [x] **1. Turn on the five strict compiler options**
  - **Goal:** every package type-checks with `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, `noFallthroughCasesInSwitch` and `noImplicitReturns` on top of `strict`. Nothing else needs changing, because they give 0 findings today.
  - **Files:**
    - `tsconfig.base.json`: add the five options after `strict`.
  - **Read first:** [ADR 0048](../../../../docs/adr/0048-turn-on-the-strictest-typescript-compiler-options.md)
  - **Tests:** none new. Type checking is the test.
  - **Check:** `vp lint`
- [x] **2. Sort imports with the formatter**
  - **Goal:** Oxfmt sorts imports, and the format check fails on unsorted imports. The 14 files it reorders are reformatted, with no other change.
  - **Files:**
    - `vite.config.ts`: in the `fmt` block, add `sortImports`, with Oxfmt's defaults unless they fight the existing layout. Look up the option's shape in the Oxfmt docs through context7.
    - The 14 reordered `.ts` files, reformatted by `vp fmt` on the tracked files.
  - **Read first:** none
  - **Tests:** none new.
  - **Check:** `vp fmt --check $(git ls-files '*.ts' '*.json' '*.md' '*.yaml')`, then `vp test`
- [x] **3. Turn on the four categories and three plugins, and fix what they find**
  - **Goal:** `correctness`, `suspicious`, `pedantic` and `perf` are on as errors, and the `import`, `node` and `promise` plugins are on. The two noisy rules are off with reasons. The existing code passes with no new disable comments, and the three casts are gone.
  - **Files:**
    - `vite.config.ts`:
      - add `"import"`, `"node"` and `"promise"` to `plugins`;
      - add `categories: { correctness: "error", suspicious: "error", pedantic: "error", perf: "error" }`, with a comment that `style`, `restriction` and `nursery` stay off as categories (ADR 0047);
      - in `rules`, add `"typescript/prefer-readonly-parameter-types": "off"` and `"eslint/max-lines-per-function": "off"`, each with the one-line reason from Planning decisions.
    - `packages/service-runtime/src/server.ts`:
      - build the server with `createServer(getRequestListener(app.fetch))` from `node:http` and `@hono/node-server`, and call `server.listen(port, …)`;
      - read the port from `server.address()`, narrowed to `AddressInfo`, and throw if it isn't one;
      - fix the void-expression arrow returns and the Promise-executor return;
      - `startServer`'s signature and behaviour don't change.
    - `packages/service-testing/src/create-service-test.ts`: parse the config once, then `.extend("config", () => config)`, with no `as never`.
    - `packages/service-runtime/src/server.test.ts`:
      - parse each log line with a zod schema `{ msg?: string, port?: number }` through `safeParse`, instead of `as`;
      - fix the void-expression and Promise-executor returns;
      - fix the `no-useless-undefined` finding.
    - `packages/service-runtime/test/fixtures/server.ts`: fix the Promise-executor return.
    - `packages/service-runtime/src/settings.test.ts`:
      - move the two `parse` helpers to module scope (`consistent-function-scoping`);
      - add the `u` flag to its regexes.
    - `services/example/src/config.ts` and `tools/lint-rules/src/disable-needs-reason.ts`: add the `u` flag to their regexes (`require-unicode-regexp`).
    - `packages/service-runtime/src/telemetry.ts`: replace the empty `export {}` (`unicorn/require-module-specifiers`) with whatever keeps the file a module. If type stripping needs nothing, drop it.
    - Any other category finding: fix it in the code. A disable comment is the last resort, and needs a reason the developer agrees.
  - **Read first:** [ADR 0047](../../../../docs/adr/0047-lint-with-strict-categories-and-named-picks.md), [child-process test](../../../../docs/patterns/child-process-test.md)
  - **Tests:** the existing server tests prove that the rebuilt server still listens, drains and shuts down. The example service's health test proves that the config fixture still works.
  - **Check:** `vp lint`, then `vp test`
- [ ] **4. Turn on the restriction picks, and fix what they find**
  - **Goal:** the six `restriction` picks are on, each with a one-line reason, and their exceptions are in place. Only the hard-timeout exit stays a `process.exit`. The `any` disable comment is back.
  - **Files:**
    - `vite.config.ts`, in `rules`, each pick with the reason from the ticket's Notes:
      - `typescript/no-explicit-any`;
      - `typescript/no-non-null-assertion`;
      - `typescript/explicit-module-boundary-types`;
      - `eslint/no-console`;
      - `unicorn/no-process-exit`;
      - `import/no-default-export`.
    - `vite.config.ts`, in `overrides`:
      - `no-console` off in `tools/**`;
      - `import/no-default-export` off in `vite.config.ts` and `tools/lint-rules/src/index.ts`, because their tools need a default export.
      - Check how overrides combine: the existing comment says a later override replaces an earlier one's options for the files it matches. Make sure no existing rule is lost for these files.
    - `packages/service-runtime/src/server.ts`:
      - after a clean close, no `process.exit(0)`: the process exits by itself once the loop drains;
      - the hard-timeout `process.exit(1)` gets a disable comment, with the reason from Planning decisions;
      - update the JSDoc to match;
      - add the explicit return type (`explicit-module-boundary-types`).
    - `packages/service-runtime/src/health.ts`, `packages/service-testing/src/create-service-test.ts`, `services/example/src/app.ts` and `services/example/src/config.ts`: add explicit return types to the exported functions. For `createServiceTest`, name the return type, or ask the developer if it's awkward.
    - `packages/service-testing/src/create-service-test.ts`:
      - put back the `typescript/no-explicit-any` disable comment, with its reason: "`any`, so that every app's env and schema fit";
      - add a `no-console` disable comment, with the reason that Vitest attaches each `console.log` line to the running test.
  - **Read first:** [ADR 0047](../../../../docs/adr/0047-lint-with-strict-categories-and-named-picks.md), [service composition root](../../../../docs/patterns/service-composition-root.md), [child-process test](../../../../docs/patterns/child-process-test.md)
  - **Tests:** the existing server tests prove the shutdown change:
    - `exits cleanly on SIGINT` and the SIGTERM tests still expect exit code 0, now from a drained loop;
    - `exits within the hard timeout when a request outlasts it` still expects 1.
  - **Check:** `vp lint`, then `vp test packages/service-runtime/src/server.test.ts`, then `vp test`
- [ ] **5. Turn on the style picks, and fix what they find**
  - **Goal:** the 16 `style` picks are on, each with a one-line reason. `no-magic-numbers` is off in test-only files, and the existing code passes.
  - **Files:**
    - `vite.config.ts`, in `rules`, each pick with its options and its reason from the ticket's Notes:
      - `eslint/no-magic-numbers`, with `ignore: [0, 1, -1]`, `ignoreDefaultValues`, `ignoreTypeIndexes`, `ignoreEnums` and `enforceConst`;
      - `eslint/curly`: `"all"`;
      - `typescript/consistent-type-definitions`: `"interface"`;
      - `eslint/func-style`: `"expression"`;
      - `vitest/consistent-test-it`: `test`;
      - `vitest/prefer-importing-vitest-globals`;
      - `vitest/prefer-lowercase-title`, ignoring `describe`;
      - `import/consistent-type-specifier-style`: `"prefer-top-level"`;
      - `vitest/prefer-strict-equal`;
      - `no-nested-ternary`;
      - `promise/prefer-await-to-then`;
      - `unicorn/no-await-expression-member`;
      - `typescript/method-signature-style`: `"property"`;
      - `one-var`: `"never"`;
      - `unicorn/catch-error-name`;
      - `promise/param-names`.
    - `vite.config.ts`, in the test-only override: `"eslint/no-magic-numbers": "off"`, with its reason (a test's numbers are its data).
    - Production code. Named constants replace magic numbers:
      - in `server.ts`, the 20 ms sweep interval;
      - in `config.ts`, the highest port, 65 535.
    - `func-style`: 11 `function` declarations across `health.ts`, `log.ts`, `server.ts`, `settings.ts`, `app.ts`, `config.ts`, `create-service-test.ts`, `disable-needs-reason.ts`, `log.test.ts` and `server.test.ts` become `const` arrow functions.
    - `server.ts`: rewrite the `.then` chains (`prefer-await-to-then`) and the Promise parameter names (`promise/param-names`).
    - `server.test.ts`:
      - the `.then` chains, as in `server.ts`;
      - the `(await x).y` member reads, assigned to a variable first (`unicorn/no-await-expression-member`);
      - the `curly` finding.
    - `toStrictEqual`: in `server.test.ts`, `settings.test.ts`, `health.test.ts` and `disable-needs-reason.test.ts`.
    - `log.ts`: a top-level `import type`, and a property signature instead of a method signature.
    - `app.ts`: `Deps` as an `interface`.
    - `main.ts`: `catch (error)` instead of `catch (err)`, and braces on the `if`.
    - `health.test.ts`: import `test` explicitly from its `src/test/test.ts`, or from `vite-plus/test` for packages without one.
  - **Read first:** [ADR 0047](../../../../docs/adr/0047-lint-with-strict-categories-and-named-picks.md), [service API tests](../../../../docs/patterns/service-api-test.md) (rules 4, 12 and 16), [service composition root](../../../../docs/patterns/service-composition-root.md)
  - **Tests:** none new. The existing tests must still pass after the rewrites.
  - **Check:** `vp lint`, then `vp test`, then `vp run -r build`
- [ ] **6. Describe the new rule set in the linting guide and tech stack**
  - **Goal:** contributors can find out which rules are on and why, and where the exceptions are.
  - **Files:**
    - `docs/develop/linting.md`: add a section on the rule set. It covers:
      - the four categories as errors, and the categories that stay off;
      - the plugins;
      - that every rule turned on or off by name has its reason in `vite.config.ts`, the one home for the rule list, so the guide doesn't copy it;
      - the exceptions: `no-magic-numbers` off in test-only files, `no-console` off in `tools/`, and default exports allowed in `vite.config.ts` and the lint plugin's entry point. Any other exception is a disable comment.
      - a link to ADR 0047;
      - a mention that Oxfmt sorts imports, if it fits there; otherwise the formatter's home.
    - `docs/develop/tech-stack.md`: link ADRs 0047 and 0048 from the right rows. That's the Toolchain row for lint, and the Language row or a new type-checking row for the compiler options.
  - **Read first:** the `writing-docs` skill
  - **Tests:** none.
  - **Check:** `vp fmt --check docs/develop/linting.md docs/develop/tech-stack.md`

**7. Acceptance criteria**, checked at the test boundary:

- [ ] `vp check` runs the four categories as errors with the seven plugins, and `style`, `restriction` and `nursery` aren't on as categories: proven by the `lint` block of `vite.config.ts` and a passing `vp check`.
- [ ] Every rule turned on or off beyond the categories has a one-line reason next to it: proven by a review of `vite.config.ts`.
- [ ] Test-only files relax only `no-magic-numbers`, and `tools/` relaxes only `no-console`. Every other exception is a disable comment with a reason: proven by the overrides in `vite.config.ts` and `arcturus/disable-needs-reason`.
- [ ] The five compiler options are on for every package: proven by `tsconfig.base.json`, which all five tsconfigs extend.
- [ ] The formatter sorts imports, and `vp check` fails on unsorted imports: proven by a deliberate swap of two imports, which `vp check` reports and which is then reverted.
- [ ] The test harness's disable comment for `any` is back with its reason: proven by `packages/service-testing/src/create-service-test.ts`.
- [ ] The existing code passes `vp check`, `vp test` and `vp run -r build`.
- [ ] Each of these fails `vp check` once on a deliberate violation, which is then reverted:
  - a category rule, such as a regex without the `u` flag;
  - a named pick, such as `any`;
  - a compiler option, such as an unchecked index read;
  - a magic number, which fails in production code and passes in a test.

  Record each result in Notes.

- [ ] The linting guide describes the categories, the picks and the exceptions, and links ADR 0047. The tech stack links both ADRs: proven by `docs/develop/linting.md` and `docs/develop/tech-stack.md`.

## Notes

- 2026-11-23: Step 2 kept Oxfmt's default `sortImports` groups, which put a blank line between built-in, external and local imports.
- 2026-11-23: Step 3 changed what steps 4 and 5 will find:
  - `startServer` now builds the server before `listen`, and `close` and `shutdown` sit outside the listen callback, which makes step 4's exit rework simpler.
  - `server.test.ts` and the server fixture sleep with `node:timers/promises`.
  - `startFixture` rejects from `child.once("exit")` instead of `exited.then`, so step 5 has one `.then` fewer to rewrite.
  - `telemetry.ts` keeps `export {}`, with a disable comment for `unicorn/require-module-specifiers`, because an empty file fails `unicorn/no-empty-file`. It's the `--import` entry point for the example service's scripts.
  - `createServer`'s request listener wraps hono's listener in `void`, because `no-misused-promises` flags an async request listener. Hono's listener catches a failed request itself.
