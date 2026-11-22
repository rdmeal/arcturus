---
type: adr
status: accepted
date: 2026-11-22
summary: Each test clones its own empty database from a template migrated once per run, because handlers commit their own transactions, which rules out rollback isolation, and truncation leaks state when a table is missed.
tags: [testing, database]
---

# Give every test a fresh database from a migrated template

## Context

API tests run against a real database (see [Test services mostly through their API, in-process](./0032-test-services-through-their-api.md)), on a Postgres server started for the test run (see [Run test databases in Testcontainers](./0034-run-test-databases-in-testcontainers.md)). Every test should start from a known state, so that tests can run in any order, in parallel and on separate CI shards, and a failure points at the test that failed.

Handlers open and commit their own transactions, and queue jobs inside them (see [Open database transactions explicitly in handlers](./0022-open-database-transactions-explicitly-in-handlers.md)). The common trick of wrapping each test in a transaction and rolling it back therefore doesn't work: the handler's commit is real.

Each service's schema comes from its committed migrations, run with Graphile Migrate (see [Migrate databases with Graphile Migrate](./0013-migrate-databases-with-graphile-migrate.md)), plus graphile-worker's own `graphile_worker` schema, which it creates itself (see [Run background jobs with graphile-worker](./0012-run-background-jobs-with-graphile-worker.md)). Running all of that for every test would be slow. Postgres can clone a database from another with `CREATE DATABASE … TEMPLATE …`, which copies a small schema quickly.

## Decision

We will give every test its own database, cloned from a template:

- Once per test run, `globalSetup` builds a template database for each service with a database. It runs the service's committed migrations through Graphile Migrate's Node API, then installs graphile-worker's schema with its `runMigrations`.
- Each test gets a fresh database with `CREATE DATABASE … TEMPLATE <service template>`, and the database is dropped when the test ends.
- The known state is the empty schema: the migrations, with only the lookup rows the schema itself needs. There is no shared seed data, and each test arranges what it relies on.

## Consequences

- Every test starts identical, whatever ran before it or alongside it, so files run in parallel and shards need no coordination.
- No cleanup code has to know every table, graphile-worker's included.
- Each test pays for a `CREATE DATABASE` and a new connection pool. If that turns out too slow, the fallback is a database per test file, at the cost of tests in one file seeing each other's rows.
- A test shows everything it depends on, with no rows from a seed it can't see. Tests carry more setup, which test data factories keep short.
- A test can't open a connection to the template while it is being cloned, which the harness has to respect.

## Alternatives considered

- **Rolling back a transaction after each test:** impossible, because handlers commit their own transactions.
- **A database for each test worker, truncated between tests:** the cheapest, and common in Node projects, but truncation has to list every table, and a table it misses leaks state into the next test.
- **A database for each test file:** cheaper than one per test, but tests in the same file see each other's rows. Kept as the fallback.
- **A shared seed dataset in the template:** less setup per test, but tests come to depend on rows nobody can see, and changing the seed breaks distant tests.
