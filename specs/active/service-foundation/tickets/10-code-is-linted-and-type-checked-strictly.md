---
type: ticket
status: in-progress
blocked-by: []
scopes: [arcturus]
---

# 10: Code is linted and type-checked strictly

Part of [the spec](../spec.md). It delivers no user story: it was added after the spec, from [Lint with Oxlint's strict categories, plus named picks](../../../../docs/adr/0047-lint-with-strict-categories-and-named-picks.md) and [Turn on the strictest TypeScript compiler options](../../../../docs/adr/0048-turn-on-the-strictest-typescript-compiler-options.md). It comes before the tickets that add most of the foundation's code, so they are written strictly from the start.

## What to build

`vp check` holds every package to the strict lint set and the strict compiler options. A contributor who writes `any`, a non-null assertion, a magic number, a `function` declaration, a default export, a nested ternary, `toEqual`, or an unchecked index read is stopped, with the reason for each rule beside it in the config. The formatter sorts imports. The code that already exists is brought into line, and the linting guide describes the new set.

## Acceptance criteria

- [ ] `vp check` runs Oxlint's `correctness`, `suspicious`, `pedantic` and `perf` categories as errors, with the `import`, `node` and `promise` plugins on alongside `unicorn`, `typescript`, `oxc` and `vitest`. `style`, `restriction` and `nursery` are not on as categories.
- [ ] Every rule turned on or off beyond those categories has a one-line reason next to it in the config. That covers the named picks listed below, and any noisy rule inside the categories that is turned off.
- [ ] Test-only files relax only `no-magic-numbers`. `tools/` relaxes only `no-console`. Every other legitimate exception is a disable comment with a reason.
- [ ] The five compiler options below are on for every package.
- [ ] The formatter sorts imports, and `vp check` fails on unsorted imports.
- [ ] The test harness's disable comment for `any` (the type parameter that lets any app fit) is back, with its reason, now that `no-explicit-any` is on.
- [ ] The existing code passes `vp check`, `vp test` and the build.
- [ ] Each of these was shown to fail `vp check` once on a deliberate violation, which was then reverted: one rule from a category, one named pick, one compiler option, and a magic number that fails in production code but passes in a test.
- [ ] The linting guide describes the categories, the picks and the exceptions, and links the lint ADR. The tech stack links both ADRs.

## Notes

The full set agreed for the ADRs, which the config is built from:

- **Named picks from `restriction`:**
  - `typescript/no-explicit-any`;
  - `typescript/no-non-null-assertion`;
  - `typescript/explicit-module-boundary-types`, so a package's public API doesn't change by accident;
  - `eslint/no-console`, so services log through `service-runtime`;
  - `unicorn/no-process-exit`, so exits go through `service-runtime`'s lifecycle;
  - `import/no-default-export`, except in files whose tool needs a default export: the Vite+ config and the lint plugin's entry point.
- **Named picks from `style`:**
  - `eslint/no-magic-numbers`, ignoring `0`, `1` and `-1`, with `ignoreDefaultValues`, `ignoreTypeIndexes`, `ignoreEnums` and `enforceConst`, and off in test-only files;
  - `eslint/curly`: `"all"`;
  - `typescript/consistent-type-definitions`: `"interface"`;
  - `eslint/func-style`: `"expression"`, so named functions are `const` arrow functions;
  - `vitest/consistent-test-it`: `test`;
  - `vitest/prefer-importing-vitest-globals`;
  - `vitest/prefer-lowercase-title`, ignoring `describe`;
  - `import/consistent-type-specifier-style`: `"prefer-top-level"`;
  - `vitest/prefer-strict-equal`;
  - `no-nested-ternary`;
  - `promise/prefer-await-to-then`;
  - `unicorn/no-await-expression-member`;
  - `typescript/method-signature-style`: `"property"`;
  - `one-var`: `"never"`, so each `const` or `let` declares one variable;
  - `unicorn/catch-error-name`;
  - `promise/param-names`.
- **`style` rules that stay off:**
  - `no-named-export`, `prefer-default-export`, `group-exports`, `exports-last`;
  - `sort-keys`, `id-length`, `capitalized-comments`, `init-declarations`, `new-cap`;
  - `no-ternary`, because only nested ternaries are banned;
  - `promise/avoid-new`, `promise/prefer-await-to-callbacks`, `import/no-nodejs-modules`;
  - `vitest/prefer-to-be-truthy`, `prefer-to-be-falsy`, `prefer-expect-assertions`, `prefer-expect-resolves`, `no-importing-vitest-globals`, `prefer-describe-function-title`;
  - `sort-imports`, because Oxfmt's `sortImports` sorts imports instead.
- **No `consistent-type-imports`:** `verbatimModuleSyntax` already makes a type-only import without `type` a compile error.
- **Likely noisy rules to turn off, with a reason:** `typescript/prefer-readonly-parameter-types` (18 findings in a probe on 2026-11-23, noisy on library types) and `eslint/max-lines-per-function`. Confirm both when planning.
- **Compiler options, on top of `strict: true`:** `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, `noFallthroughCasesInSwitch`, `noImplicitReturns`. Measure their cost first: it decides how big the fix-up steps are.
- **Patterns already updated for this set:** [service API tests](../../../../docs/patterns/service-api-test.md) (rules 4, 12 and 16) and [service composition root](../../../../docs/patterns/service-composition-root.md) (rule 12, the `Deps` interface).
- **Frontend linting is decided separately,** starting from this set.
- **Any new plugin goes through the checks** in [Prefer established lint plugins, and write a local rule only when none fits](../../../../docs/adr/0046-prefer-established-lint-plugins-over-local-rules.md). None is expected, because all three new plugins are built into Oxlint.
