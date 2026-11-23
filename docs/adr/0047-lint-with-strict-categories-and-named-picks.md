---
type: adr
status: accepted
date: 2026-11-23
summary: Turn on Oxlint's correctness, suspicious, pedantic and perf categories as errors, with the import, node and promise plugins, and add restriction and style rules only as named picks with a reason each, so code, tests included, is linted strictly from the start.
tags: [tooling]
---

# Lint with Oxlint's strict categories, plus named picks

## Context

Lint is Oxlint, run by `vp check` with type-aware rules, and any warning fails the check (see [Build, test, lint and format with Vite+](./0017-build-test-lint-and-format-with-vite-plus.md)). Until now, only Oxlint's default category, `correctness`, was on. A disable comment for `typescript/no-explicit-any` turned out to be silencing a rule that wasn't on at all.

Oxlint groups its rules into categories:

- `correctness`, `suspicious`, `pedantic` and `perf` are graded by how likely a finding is to be a real problem.
- `style` and `restriction` are menus of conventions to choose from, and many of their rules contradict each other: `import/no-named-export` against `import/prefer-default-export`, or `oxc/no-async-await`.
- `nursery` holds rules that aren't stable yet.

Oxlint's documented approach is to turn categories on, then turn off individual rules that don't fit.

On 2026-11-23 (Oxlint 1.93, tsgolint 7.0.2006), we turned each category on alone over the repository's code. `suspicious` found 6 problems, `pedantic` 35 (18 of them `prefer-readonly-parameter-types`), `perf` none, `style` 226, `restriction` 69, and `nursery` 23, all of them false positives from `no-undef` on TypeScript.

The foundation's services are about to be written (the service foundation spec), so turning strictness on now costs little cleanup. The code written so far follows no deliberate conventions, so the maintainer chose to judge each rule on its merits, not by how much it would change existing code.

## Decision

We will lint strictly:

- **Categories:** `correctness`, `suspicious`, `pedantic` and `perf` are on wholesale, as errors. `style`, `restriction` and `nursery` are off as categories.
- **Plugins:** Oxlint's built-in `import`, `node` and `promise` plugins are on, alongside `unicorn`, `typescript`, `oxc` and `vitest`.
- **Named picks:** a rule from `restriction` or `style` is turned on by name, with a one-line reason in the config. Examples:
  - `typescript/no-explicit-any` and `typescript/no-non-null-assertion`;
  - `typescript/explicit-module-boundary-types`, so a package's public API doesn't change by accident;
  - `eslint/no-console`, so services log through `service-runtime`;
  - `import/no-default-export`;
  - `eslint/no-magic-numbers`;
  - `eslint/curly`.
- **Noisy rules:** a rule inside a chosen category that fights our patterns is turned off by name, with a reason. Everything else stays an error.
- **Tests:** test files are linted as strictly as production code. The only exception is `no-magic-numbers`, because a test's numbers are its data.

`vite.config.ts` holds the full list of rules and their settings, and [Linting](../develop/linting.md) explains them to contributors.

## Consequences

- Code is checked strictly from the first service onwards. Mistakes that `correctness` alone misses, such as unsafe type assertions, floating promises and `any`, fail the check.
- Every rule that's on or off beyond the categories has its reason next to it. Changing one is a one-line edit with a new reason, not a new ADR.
- Turning on the categories, and any Oxlint upgrade that adds rules to them, can bring new findings that must be fixed or turned off by name before the check passes.
- `pedantic` has occasional false positives, so more rules may need turning off as code grows.
- Tests are more verbose in places, for example under `noUncheckedIndexedAccess` (see [Turn on the strictest TypeScript compiler options](./0048-turn-on-the-strictest-typescript-compiler-options.md)), instead of being relaxed.
- The frontend's lint rules (React, accessibility and hooks) are decided separately, starting from this set.

## Alternatives considered

- **Keep only `correctness`:** misses rules the maintainer wants, starting with `no-explicit-any`.
- **Turn on every category (`all`):** `style` and `restriction` contradict themselves and our code, and `nursery` is unstable.
- **Warnings for noisy rules instead of turning them off:** `denyWarnings` fails the check on warnings anyway, so a warning only adds confusion.
- **Relax type-safety rules in tests,** as is common: shorter test code, but tests that lie about types.
