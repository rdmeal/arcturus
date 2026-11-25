---
type: adr
status: accepted
date: 2026-11-25
summary: The tests' Postgres container, migrated templates and cloned databases live in @arcturus/test-database, apart from the service harness, so service-runtime's own database tests can use them without service-runtime and service-testing depending on each other.
tags: [testing, monorepo]
---

# Keep the tests' Postgres in its own package

## Context

Tests start their own Postgres with Testcontainers, once per run from Vitest's root `globalSetup` (see [Run test databases in Testcontainers](./0034-run-test-databases-in-testcontainers.md)), and every test gets a database cloned from its service's migrated template (see [Give every test a fresh database from a migrated template](./0035-give-every-test-a-fresh-database-from-a-template.md)).

Two packages need those databases:

- `@arcturus/service-testing`, the harness every service's API tests are built on. Its `db` fixture opens `service-runtime`'s database wrapper on the test's database, so it depends on `@arcturus/service-runtime`.
- `@arcturus/service-runtime` itself, whose own tests prove what in-process API tests can't: that a self-deadlock fails with a lock-timeout error, and that readiness fails when the database goes away.

If the container, templates and cloning lived in `service-testing`, `service-runtime`'s tests would have to import `service-testing`, which already imports `service-runtime`. Every package declares what it imports (see [Organise the repository as pnpm package-based workspaces](./0016-organise-the-repository-as-pnpm-workspaces.md)), so that would be a cycle between two workspace packages. The cause is that `service-testing` would hold two layers: Postgres test infrastructure, which needs nothing from the runtime, and the service harness, which does.

## Decision

We will keep the tests' Postgres infrastructure in its own package, `@arcturus/test-database` in `packages/test-database`. It holds the root `globalSetup` (the container, the image read from `compose.yaml`, the templates) and `cloneDatabase`, and it depends on nothing in the runtime. `@arcturus/service-testing` depends on it for the `db` fixture, and `@arcturus/service-runtime` takes it as a dev dependency for its own database tests.

## Consequences

- Dependencies stay one-way: `service-testing` depends on `service-runtime` and `test-database`, and `service-runtime` depends on `test-database` only for its tests.
- `service-runtime`'s database tests get a real, empty database of their own, the same way service tests do, rather than a workaround on a shared database.
- There are two test-only packages instead of one. Lint treats both as test-only code, and production code may import neither.
- A service's tests still use only `service-testing`; `test-database` is an implementation detail of the harness, documented in its own README.

## Alternatives considered

- **Everything in `service-testing`:** one test package, but `service-runtime`'s own database tests would need it, making the two packages depend on each other.
- **`service-runtime`'s database tests on the default `postgres` database, using advisory locks:** no dependency at all, but the tests wouldn't prove the realistic case, a row lock in a table, and would share one database across tests.
