---
type: guide
---

# Linting

How lint works in this repository, and how to silence it when you must. Lint is [Oxlint](https://oxc.rs/docs/guide/usage/linter), run by `vp check` with the format and type checks (see [Commands](./commands.md)). It runs in CI and in your editor, not in the pre-commit hook, which only formats (see [Run only formatters in git hooks](../adr/0052-run-only-formatters-in-git-hooks.md)). Warnings fail it, like errors.

## Where it's configured

- **`vite.config.ts`**, in its `lint` block: the categories, the plugins, the rules, and `overrides` for test-only files and the [exceptions](#the-rule-set). Test-only files are the ones [Service API tests](../patterns/service-api-test.md) rule 2 lists: `*.test.ts`, anything under a `test/` folder, `*.handlers.ts`, `packages/service-testing` and `packages/test-database`.
- **`tools/lint-rules`** (`@arcturus/lint-rules`): the repository's own rules, as an Oxlint JS plugin named `arcturus`. Each rule has unit tests next to it. Look for an established plugin before writing a rule here: see [Prefer established lint plugins, and write a local rule only when none fits](../adr/0046-prefer-established-lint-plugins-over-local-rules.md).

## The rule set

Lint is strict, in code and tests alike: see [Lint with Oxlint's strict categories, plus named picks](../adr/0047-lint-with-strict-categories-and-named-picks.md).

- **Categories:** Oxlint's `correctness`, `suspicious`, `pedantic` and `perf` are on, as errors. `style`, `restriction` and `nursery` are off as categories, because their rules contradict each other or aren't stable.
- **Plugins:** `unicorn`, `typescript`, `oxc`, `vitest`, `import`, `node` and `promise`.
- **Named picks:** rules from `style` and `restriction` that we want, such as `no-explicit-any`, `no-console`, `no-magic-numbers` and `func-style`, are turned on one by one.
- **Rules turned off:** a rule inside a chosen category that fights our code is turned off by name.

`vite.config.ts` is the list: every pick and every rule turned off has its one-line reason next to it there. To change one, edit its line and its reason.

Exceptions are few:

- **Test-only files** turn off `no-magic-numbers`, because a test's numbers are its data.
- **`tools/`** turns off `no-console`, because its scripts write to the terminal.
- **`vite.config.ts` and the lint plugin's entry point** may use a default export, because their tools read it.
- **Everything else is a disable comment** with its reason (see below). The common one: a Hono route builder (`health`, `createApp`, each `<slice>Route` and area router) disables `typescript/explicit-module-boundary-types`, because a Hono app's type is its routes, inferred so the RPC client follows them.

Imports are sorted by the formatter, not by lint, so `vp fmt` fixes their order. The TypeScript compiler options are strict too: see [Turn on the strictest TypeScript compiler options](../adr/0048-turn-on-the-strictest-typescript-compiler-options.md).

## Disable comments

Every disable comment says why the rule doesn't apply, after `--`:

```ts
// oxlint-disable-next-line no-restricted-imports -- the API can't put a match mid-round
import { insertMatchState } from "./test/direct-db.ts";
```

- A disable or enable comment without a reason fails `arcturus/disable-needs-reason`. This applies to every `oxlint-` and `eslint-` form: `disable`, `enable`, `-line` and `-next-line`.
- A disable comment that no longer suppresses anything fails too, so remove it when the code it covered changes.
- Disable the one rule that fires, on the one line it fires on, rather than a whole file or every rule.

## Guard rails

These rules enforce the testing patterns. Their error messages name the pattern rule behind them, except `vitest/no-hooks`, whose message Oxlint fixes.

| Rule                            | Files           | What it stops                                                                                                                                                            | Why                                                          |
| ------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------ |
| `no-restricted-imports`         | production code | importing test-only code, `@arcturus/service-testing`, `@arcturus/test-database`, `msw`, `fishery` or `@testcontainers/*`                                                | [Service API tests](../patterns/service-api-test.md) rule 3  |
| `no-restricted-imports`         | test-only files | importing a service's `direct-db` module, or `@arcturus/service-testing/direct-db` outside a service's `src/test/direct-db.ts`, without a disable comment and its reason | [Service API tests](../patterns/service-api-test.md) rule 13 |
| `vitest/no-hooks`               | test-only files | `beforeAll`, `beforeEach`, `afterEach` and `afterAll`                                                                                                                    | [Service API tests](../patterns/service-api-test.md) rule 6  |
| `vitest/no-restricted-matchers` | test-only files | snapshot matchers                                                                                                                                                        | [Service API tests](../patterns/service-api-test.md) rule 12 |
| `arcturus/disable-needs-reason` | all             | a disable comment without a reason                                                                                                                                       | [Disable comments](#disable-comments)                        |

`vitest/no-standalone-expect` is set to treat `test` as a test block, because service tests use the `test` that their `src/test/test.ts` builds with `test.extend`. Without that setting, every `expect` in a service test is reported.
