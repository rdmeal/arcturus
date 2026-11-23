---
type: adr
status: accepted
date: 2026-11-23
summary: Add noUncheckedIndexedAccess, exactOptionalPropertyTypes, noImplicitOverride, noFallthroughCasesInSwitch and noImplicitReturns on top of strict, accepting wordier code in places for bugs that lint can't see.
tags: [tooling]
---

# Turn on the strictest TypeScript compiler options

## Context

`tsconfig.base.json`, which every package extends, sets `strict: true` and nothing stricter. `vp check` type-checks with it (see [Build, test, lint and format with Vite+](./0017-build-test-lint-and-format-with-vite-plus.md)).

`strict` leaves some unsafe code unchecked:

- Indexing an array or record (`rows[0]`, `byId[key]`) is typed as always present.
- An optional property accepts an explicit `undefined`, so "missing" and "set to `undefined`" can't be told apart.
- A method can override a base method without saying so.
- A `switch` case can fall through silently.
- A function can return a value on some paths and nothing on others.

Lint can't see the first two, because they come from how the compiler types the code. The widely used `@tsconfig/strictest` preset turns all five checks on.

Lint was made strict at the same time (see [Lint with Oxlint's strict categories, plus named picks](./0047-lint-with-strict-categories-and-named-picks.md)), before the foundation's services are written.

## Decision

We will add these options to `tsconfig.base.json`, on top of `strict: true`:

- `noUncheckedIndexedAccess`
- `exactOptionalPropertyTypes`
- `noImplicitOverride`
- `noFallthroughCasesInSwitch`
- `noImplicitReturns`

## Consequences

- Reading a missing array element or record key is a type error until the code handles `undefined`. That's the most common source of `undefined` reaching code that doesn't expect it.
- Code is wordier in places. An index read needs a check, or a pattern that proves the value is there, such as destructuring after checking the length.
- With `exactOptionalPropertyTypes`, code that passes `undefined` explicitly must declare it (`name?: string | undefined`). Some library types may need care when objects are built for them.
- Every package gets these options from the base config. A package that can't meet them would need an override, and a reason for it.

## Alternatives considered

- **Stop at `strict: true`:** the usual default, but it leaves index access and optional properties unchecked.
- **Only the options that don't make code wordier** (`noImplicitOverride`, `noFallthroughCasesInSwitch`, `noImplicitReturns`): the two left out are the ones that catch the most real bugs.
