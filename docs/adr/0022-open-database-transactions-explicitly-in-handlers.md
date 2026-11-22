---
type: adr
status: accepted
date: 2026-11-21
summary: Handlers open their own transactions and pass the transaction's connection to every query and queued job, through a database wrapper that cannot run queries itself, so what runs inside a transaction is visible in the code and the pool can't be used by mistake.
tags: [backend, database]
---

# Open database transactions explicitly in handlers

## Context

Services are made of vertical slices, each with a handler that holds the slice's logic (see [Structure services as vertical slices with a task-based API](./0021-structure-services-as-vertical-slices.md)). Jobs are queued by calling `graphile_worker.add_job()` in the same transaction as the data they belong to (see [Run background jobs with graphile-worker](./0012-run-background-jobs-with-graphile-worker.md)), so whoever owns a transaction must be able to pass it to both the slice's SQL and the job queue.

In Slonik, the pool and a transaction share one query interface, so a query function works with either (see [Access PostgreSQL with Slonik](./0011-access-postgresql-with-slonik.md)). That makes one mistake easy: inside a transaction, running a query on the pool instead of the transaction. The query runs outside the transaction, and if it touches a row the transaction has locked, it waits for a lock its own handler holds, and the handler hangs.

Not every piece of work fits in a single transaction. Outbound HTTP calls must never happen inside one. For example, the player gateway's delivery job reads a pending decision request, calls the player, and only then records the outcome and queues the callback.

## Decision

We will have each handler open its transactions explicitly and pass the transaction's connection to every query function and to every job it queues.

To make the pool hard to misuse:

- Handlers receive a database wrapper with only two methods, `transaction` and `read`. Each gives a connection to a callback. The wrapper has no query methods of its own, so the pool can't be queried directly.
- Only the handler receives the service's dependencies. Query functions take a connection and their parameters, and other functions take exactly what they use.
- Every pool sets Postgres's `lock_timeout` and `statement_timeout`, so a mistake that slips through fails with an error instead of hanging.

## Consequences

- What runs inside a transaction is visible in the code and checked by the compiler, and it works the same in routes and jobs.
- Jobs that make network calls open a transaction only around their writes, with no special mechanism.
- Every query function takes a connection argument, and queries outside a transaction need a small `read` callback.
- Opening a second transaction inside the first is still possible, but it takes a deliberate, visible line.
- Lock and statement timeouts can also cut off a legitimately slow query, so their values need choosing with care.

## Alternatives considered

- **The route or task wrapper opening one transaction per command:** one command, one unit of work, and impossible to forget. Rejected because jobs that make network calls would need an exception, which means two mechanisms.
- **An implicit transaction in `AsyncLocalStorage`** (NestJS-style `@Transactional`): no argument to pass, but you can't see what runs inside the transaction, a query outside its scope silently uses the pool, and it adds the kind of runtime magic [Build every service with Hono, wired by hand](./0009-build-every-service-with-hono.md) avoided.
- **A unit-of-work object:** mostly a way to coordinate repositories, which the vertical-slice structure doesn't have.
- **A separate dependencies object carrying the transaction but not the pool:** unnecessary once the wrapper can't run queries, and it would be another bag of dependencies that grows over time.
