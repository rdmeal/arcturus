---
type: guide
---

# Linting

How lint works in this repository, and how to silence it when you must. Lint is [Oxlint](https://oxc.rs/docs/guide/usage/linter), run by `vp check` with the format and type checks (see [Commands](./commands.md)). It runs in the pre-commit hook, in CI and in your editor. Warnings fail it, like errors.

## Where it's configured

- **`vite.config.ts`**, in its `lint` block: the plugins, the rules, and `overrides` for test-only files. Test-only files are the ones [Service API tests](../patterns/service-api-test.md) rule 2 lists: `*.test.ts`, anything under a `test/` folder, `*.handlers.ts` and `packages/service-testing`.
- **`tools/lint-rules`** (`@arcturus/lint-rules`): the repository's own rules, as an Oxlint JS plugin named `arcturus`. Each rule has unit tests next to it.

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

| Rule                            | Files           | What it stops                                                                                  | Why                                                          |
| ------------------------------- | --------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `no-restricted-imports`         | production code | importing test-only code, `@arcturus/service-testing`, `msw`, `fishery` or `@testcontainers/*` | [Service API tests](../patterns/service-api-test.md) rule 3  |
| `no-restricted-imports`         | test-only files | importing a service's `direct-db` module without a disable comment and its reason              | [Service API tests](../patterns/service-api-test.md) rule 13 |
| `vitest/no-hooks`               | test-only files | `beforeAll`, `beforeEach`, `afterEach` and `afterAll`                                          | [Service API tests](../patterns/service-api-test.md) rule 6  |
| `vitest/no-restricted-matchers` | test-only files | snapshot matchers                                                                              | [Service API tests](../patterns/service-api-test.md) rule 12 |
| `arcturus/disable-needs-reason` | all             | a disable comment without a reason                                                             | [Disable comments](#disable-comments)                        |

`vitest/no-standalone-expect` is set to treat `test` as a test block, because service tests use the `test` that their `src/test/test.ts` builds with `test.extend`. Without that setting, every `expect` in a service test is reported.
