---
type: adr
status: accepted
date: 2026-11-22
summary: Test data comes from fishery factories with a default for every field and deep-merged overrides, so each test shows only the values that matter, without the shared IDs and shallow copies of spread constants.
tags: [testing, tooling]
---

# Build test data with fishery factories

## Context

Tests arrange their own data, from an empty database (see [Give every test a fresh database from a migrated template](./0035-give-every-test-a-fresh-database-from-a-template.md)), and both API tests and unit tests need valid objects to work with: request bodies, responses from faked services, game states for rule tests. A test reads best when it shows only the values that matter to it, with every other field given a sensible default.

The simplest way of doing that is a default constant spread at the call site, `{ ...defaultFoo, bar: 17 }`. Every object built that way shares the constant's IDs and unique values, so two rows in one test collide on keys. The spread is also shallow, so nested objects are shared between tests. Many of our payloads are nested: decision requests, game states and game options.

[fishery](https://github.com/thoughtbot/fishery) is thoughtbot's TypeScript library for test data factories, modelled on Ruby's factory_bot. A factory is defined once, and `factory.build(overrides)` gives the same call-site shape as the spread. It also offers deep-merged overrides, a per-factory sequence for unique values, `buildList`, transient parameters (inputs that shape an object without being fields on it), and named variants of a factory.

## Decision

We will build test data with fishery factories:

- Each factory gives a valid object with a default for every field, typed from the zod-inferred type of what it builds, and each test overrides only the fields it cares about.
- Every call builds a new object with its own unique values.
- Recurring variants, such as a running tournament, are named variants of the factory, not overrides repeated across tests.
- Factories only build objects in memory. Storing data is done through the service's API, or the guarded direct-insert helpers, never fishery's `create()`.

## Consequences

- Tests show only what matters to them, and a change to a type is fixed once, in its factory.
- Deep merging means one nested field of a payload can be changed without restating the rest. Its rules have to be learnt: arrays are replaced, not merged.
- Defaults are type-checked against the schemas, so a factory can't drift from what it builds.
- It adds a dependency. fishery's release history and transitive dependencies are checked before it is added, under [Guard the dependency supply chain](./0020-guard-the-dependency-supply-chain.md). If that check fails, a new ADR replaces this one.
- fishery's `create()` gets only the built object, with no per-test connection or client, which is why storing is kept out of factories.

## Alternatives considered

- **A default constant and a spread:** the shape we want at the call site, but with shared IDs and shallow copies.
- **Our own `buildX(overrides)` function per type:** no dependency and fresh objects, but no deep merge, sequences, lists or transient parameters, so each would be rebuilt by hand.
- **Fluent builders** (`aFoo().withBar(17).build()`): more code per type. They are idiomatic in Java and C#, where object spread doesn't exist.
- **Generating data from the zod schemas** (for example `zod-fixture` or `@anatine/zod-mock`): random values hide which values matter, and make failures harder to reproduce.
