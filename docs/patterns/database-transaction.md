---
type: pattern
summary: Use when a handler reads or writes the database — open transactions explicitly, pass the connection down, lock an aggregate's root row before read-then-write, never call out over HTTP inside a transaction, and take "now" from the clock.
tags: [backend, database]
---

# Database transactions

Handlers own their transactions and pass the connection down explicitly, so what runs inside a transaction is visible in the code. The rules below also keep connections, locks and time consistent.

## When to use it

Whenever a handler, for a command, a query or a job, touches the database.

## Rules

1. Handlers reach the database only through `deps.db`, `service-runtime`'s database wrapper. It has two methods and no query methods of its own: `transaction`, which gives a callback a connection inside a transaction, and `read`, which gives a callback a pooled connection outside one.
2. A handler that writes opens one transaction with `deps.db.transaction` and does all of its writes inside it, passing the transaction's connection to every query function and to every `addJob`. A query-only handler uses `deps.db.read`.
3. Inside a transaction callback, use only the connection the callback was given. Never open a second transaction or a `read` inside it. If something you call needs the database, pass it the connection.
4. Query functions take a connection and their parameters. They never open transactions themselves, and never take `deps`.
5. A handler that reads an aggregate's state and then changes it locks the aggregate's root row first, as the first statement of its transaction, with `SELECT … FOR UPDATE`. For a match, that's the match row. Concurrent work on the same aggregate then runs one after another, and other aggregates aren't held up.
6. Isolation stays at Postgres's default, READ COMMITTED.
7. No network call ever happens inside a transaction. An outbound call caused by a write is made by a job queued in that write's transaction (see [Background jobs](./background-job.md)). A job that makes a call opens its transaction only around the writes that come after it.
8. Expected failures inside a transaction are thrown as domain errors, which roll the transaction back (see [Error handling](./error-handling.md)). Never return a failure value from inside a transaction after writing.
9. A column recording when a row was written may default to `now()` in the database.
10. A future time stored on a row, such as a deadline or an expiry, is computed in code from the clock (`clock.now()` plus a duration) and passed in. Never compute it in SQL.
11. Every comparison with the current time, in SQL or in code, uses the clock's value, passed into SQL as a parameter. Never use SQL's `now()` in a comparison. For example, "is this request late?" is decided by comparing the clock's value with the deadline when the request is handled, not by comparing a stored timestamp with the deadline.
12. Every pool sets Postgres's `lock_timeout` and `statement_timeout` (done by `service-runtime`), so a lock nobody will release, or a runaway query, fails with an error instead of hanging.

## Exemplar

- `services/example/src/messaging/send-message/handler.ts`, `sendMessage`: one transaction around the write, its connection passed to `insertMessage`, and the time taken from `deps.clock`.
- `services/example/src/messaging/get-message/handler.ts`, `getMessage`: a query-only handler using `deps.db.read`.
- `packages/service-runtime/src/database.ts`, `createDatabase`: the wrapper with only `transaction` and `read`, and the lock and statement timeouts on every connection.

## Related

- [Open database transactions explicitly in handlers](../adr/0022-open-database-transactions-explicitly-in-handlers.md)
- [Serialise work on a match with a row lock](../adr/0023-serialise-work-on-a-match-with-a-row-lock.md)
- [Run background jobs with graphile-worker](../adr/0012-run-background-jobs-with-graphile-worker.md)
- [Background jobs](./background-job.md)
- [Error handling](./error-handling.md)
- [Idempotent receivers](./idempotent-receiver.md)
