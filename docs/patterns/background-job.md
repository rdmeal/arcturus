---
type: pattern
summary: Use when a service must do work after a commit (an outbound call, anything worth retrying) — define it as a job slice with defineTask and queue it with addJob inside the transaction.
tags: [backend, database]
---

# Background jobs

A job is a slice whose entry point is a graphile-worker task instead of a route. It is queued in the same transaction as the data it belongs to, so the data is never committed without its job, and retried with backoff when it fails.

## When to use it

- Any outbound call caused by a write: a decision request to the player gateway, a match result to the tournament runner, a callback to a game service.
- Work that should happen later or be retried on failure.

## When not to

- Work that belongs in the request's own transaction. If it is only database writes in the same service, do it in the command's handler.
- A synchronous read another service needs to answer a request now. That is a query on the other service, called from inside a job if it is part of a job's work.

## Rules

1. A job slice lives in `src/<area>/<slice>/`, like any slice (see [Vertical slices](./vertical-slice.md)), with `task.ts` in place of `route.ts`, plus `schemas.ts`, `handler.ts` and `queries.ts` as needed.
2. `task.ts` exports `<slice>Task`, created with `defineTask(name, payloadSchema, handler)` from `service-runtime`. The payload schema is `<slice>Payload` in `schemas.ts`.
3. The task name is `<area>.<slice>` (`decision-delivery.deliver-decision-request`). It is stored in the database with every job, so once a job has been queued under it, it is never renamed.
4. Every task is listed in `src/tasks.ts`, the service's task registry, which builds graphile-worker's task list from the definitions.
5. Jobs are queued only with `addJob(connection, name, payload)` from `service-runtime`, passing the transaction's connection, so the job commits or rolls back with the data. Never use graphile-worker's own JavaScript `addJob`, which uses its own connection and can't join the transaction.
6. Payloads are validated against the task's schema when queued and again when the task runs.
7. The task's only work is to receive the parsed payload and call the handler with `deps`. The handler follows the same rules as any slice's handler.
8. A handler that makes network calls opens a transaction only around its writes, never around the call (see [Database transactions](./database-transaction.md)).
9. Handlers are idempotent. A job can run more than once (a retry after a crash, a timeout after the work was done), so it checks state before acting and its writes tolerate repeats (see [Idempotent receivers](./idempotent-receiver.md)).
10. A `DomainError` thrown by the handler means the input can never succeed: `defineTask` logs it as a warning with its code, and the job completes without retrying. Any other error is rethrown, and graphile-worker retries it with backoff.

## Exemplar

None yet: established by the first ticket that uses it.

## Related

- [Run background jobs with graphile-worker](../adr/0012-run-background-jobs-with-graphile-worker.md)
- [Signal expected failures with thrown domain errors](../adr/0024-signal-expected-failures-with-thrown-domain-errors.md)
- [Vertical slices](./vertical-slice.md)
- [Database transactions](./database-transaction.md)
- [Idempotent receivers](./idempotent-receiver.md)
