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
4. Every task is listed in `src/tasks.ts`, the service's task registry, which exports `tasks`, the list of every task definition. `main.ts` builds graphile-worker's task list from it with `createTaskList(tasks, deps)` from `service-runtime` and starts the worker with `startWorker`, and the service's `src/test/test.ts` passes the same `createTaskList` to the test harness.
5. Jobs are queued only with `addJob(connection, task, payload)` from `service-runtime`, passing the transaction's connection and the job slice's task definition (`<slice>Task`), so the job commits or rolls back with the data and its payload is typed by the task's schema. A command's handler imports the job slice's `task.ts` to queue it. Never use graphile-worker's own JavaScript `addJob`, which uses its own connection and can't join the transaction.
6. Payloads are validated against the task's schema when queued and again when the task runs.
7. The task's only work is to receive the parsed payload and call the handler with `deps`. The handler follows the same rules as any slice's handler.
8. A handler that makes network calls opens a transaction only around its writes, never around the call (see [Database transactions](./database-transaction.md)).
9. Handlers are idempotent. A job can run more than once (a retry after a crash, a timeout after the work was done), so it checks state before acting and its writes tolerate repeats (see [Idempotent receivers](./idempotent-receiver.md)).
10. A `DomainError` thrown by the handler means the input can never succeed: `defineTask` logs it as a warning with its code, and the job completes without retrying. Any other error is rethrown, and graphile-worker retries it with backoff.

### Tracing

11. `addJob` stores the active trace context in a reserved `_trace` payload key, and `defineTask` removes it and runs the handler in a span that continues the trace. No payload schema may define `_trace`, and no handler reads it.
12. Where queuing a job starts a new unit of work, pass `{ newTrace: true }` to `addJob`, so the job starts a new trace linked to the current one. A new unit of work is a match's start, queued by the tournament runner, or a decision request, queued by a game service. Every other job continues its trace. If a new flow seems to need `newTrace` elsewhere, ask whether it would otherwise join one trace across a whole match or tournament.
13. `defineTask` adds `jobId`, `taskName` and `attempt` to the observability context. The handler annotates the domain IDs from its payload (see [Observability](./observability.md)).

## Exemplar

- `services/example/src/messaging/deliver-message/`, `deliverMessageTask` and `deliverMessage`: the task defined with its payload schema, and a handler that checks the message's state before calling out, calls out outside any transaction, then writes in its own transaction.
- `services/example/src/messaging/send-message/handler.ts`, `sendMessage`: `addJob` with the task definition, inside the transaction that inserts the message.
- `services/example/src/tasks.ts`, `tasks`: the task registry, which `services/example/src/main.ts` turns into the worker's task list.

## Related

- [Run background jobs with graphile-worker](../adr/0012-run-background-jobs-with-graphile-worker.md)
- [Signal expected failures with thrown domain errors](../adr/0024-signal-expected-failures-with-thrown-domain-errors.md)
- [Trace each decision through jobs as its own trace](../adr/0043-trace-each-decision-through-jobs-as-its-own-trace.md)
- [Observability](./observability.md)
- [Vertical slices](./vertical-slice.md)
- [Database transactions](./database-transaction.md)
- [Idempotent receivers](./idempotent-receiver.md)
