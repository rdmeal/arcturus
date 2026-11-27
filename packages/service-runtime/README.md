# @arcturus/service-runtime

What every service shares at run time: the app skeleton with request logging, health checks and error handling, the domain errors and request validation, the database wrapper, background jobs and their worker, the clock, the logger and its context fields, server start-up and graceful shutdown, settings parsing, and the OpenTelemetry entry point. Each service still owns its own configuration schema and wires its own dependencies.

How a service is put together with it is in the [service composition root](../../docs/patterns/service-composition-root.md) pattern, and how to log and annotate is in the [observability](../../docs/patterns/observability.md) pattern.

## Exports

### `createServiceApp({ db?, worker? })`

Returns the Hono app every service's `createApp(deps)` starts from, and chains its routers onto. It installs, in this order:

- **request logging:** one `"request completed"` line per request, with `method`, `route` (the matched route pattern, left out when nothing matched), `status` and `durationMs`. It's at `info`, or at `debug` for the health endpoints. Each request also gets its own scope for `annotate`.
- **the health endpoints:** `GET /health/live`, which always answers `{ status: "live" }`, and `GET /health/ready`. Readiness checks only the service's own database and job worker, when they are passed: it answers `503 { status: "not-ready" }` when `select 1` fails or the worker isn't running, and `{ status: "ready" }` otherwise.
- **the error handler:** every error a route throws becomes RFC 9457 problem details, sent as `application/problem+json`. A domain error answers its category's status and is logged at `debug`; a validation failure from `validateRequest` answers 400; anything else answers a generic 500 and is logged at `error`. How handlers use it is in the [error handling](../../docs/patterns/error-handling.md) pattern.

Why every service starts from it is in [Build every service's app from one runtime factory](../../docs/adr/0049-build-every-services-app-from-one-runtime-factory.md).

### `createDatabase({ connectionString, lockTimeoutMs?, statementTimeoutMs? })` and `Database`

Opens a Slonik pool and resolves to `{ db, close }`. It connects straight away, so it rejects when the database is unreachable. `close` ends the pool; pass it to `startServer`'s `onClose`.

`db` is a `Database`, with only two methods: `transaction(routine)` runs `routine` with a connection inside a transaction, and `read(routine)` with a pooled connection outside one. It has no query methods of its own. Every connection has a lock timeout (5 seconds by default) and a statement timeout (30 seconds). Every row a query returns is validated against its `sql.type` schema, `timestamp` and `timestamptz` columns are read as `Date`, and a query on another connection while a transaction is open in the same request throws. How handlers use it is in the [database transactions](../../docs/patterns/database-transaction.md) pattern.

### `defineTask(name, payloadSchema, handler)` and `TaskDefinition`

Defines a background job's task, as a `TaskDefinition<Deps, Payload>`, where `handler(deps, payload)` receives the payload parsed with `payloadSchema`. The name is stored with every job, so it never changes once a job has been queued. How a job slice is written is in the [background jobs](../../docs/patterns/background-job.md) pattern.

### `addJob(connection, task, payload)`

Queues a job for `task` on a transaction's connection, through `graphile_worker.add_job()`, so it commits or rolls back with the transaction. The payload is typed by the task's schema, and checked against it before it's queued: a payload that doesn't match throws a `ZodError`.

### `createTaskList(tasks, deps)`, `TaskList` and `workerLogger`

Builds graphile-worker's `TaskList` from task definitions, each running its handler with `deps`. While a job runs, its log lines carry `jobId`, `taskName` and `attempt`. A payload that doesn't match the task's schema fails the job. A `DomainError` from the handler is logged at `warn` with its `code`, and the job completes without retrying; any other error is rethrown, so graphile-worker retries the job with backoff. `workerLogger` is the logger the worker passes to graphile-worker: its lines go to `log`, with its `info` lines at `debug`.

### `startWorker({ connectionString, taskList })` and `Worker`

Starts graphile-worker on the service's database, without its own signal handlers, and resolves to a `Worker` with `isRunning()` and `stop()`. `isRunning()` turns false when `stop()` is called, or if the worker fails, which is logged at `error`. `stop()` stops taking jobs and resolves once the jobs in progress have finished. Stop the worker in `startServer`'s `onClose`, before closing the database pool.

### `DomainError`, `NotFoundError`, `ConflictError` and `RuleViolationError`

The domain error categories, each constructed with `(code, message)`: a kebab-case code the client translates, and a message written for the client. `DomainError` is the abstract base, never thrown itself. The error handler answers them with 404, 409 and 422. A thrown domain error rolls back any open transaction.

### `validateRequest(target, schema)`

Validates a request's `json`, `query` or other target against a zod schema, as Hono middleware, so `c.req.valid(target)` gives the parsed input. A failure answers 400 problem details with the code `invalid-request` and an `issues` list of `{ path, code, message }`. Services use it in place of `zValidator` from `@hono/zod-validator`.

### `ProblemDetails`, `ProblemIssue` and `WithProblemDetails<App>`

`ProblemDetails` is the error body's type: `type` (always `about:blank`), `title`, `status`, `detail`, `code` and, for validation failures, `issues`, a list of `ProblemIssue`. `WithProblemDetails<App>` adds that body to every route of an app's type for the RPC client, for the statuses 400, 404, 409, 422 and 500. A service's `AppType` is `WithProblemDetails<ReturnType<typeof createApp>>`.

### `sql` and the connection types

Slonik's SQL tag, with a `void` type alias for statements that return no rows (`sql.typeAlias("void")`), and the types `CommonQueryMethods`, `DatabasePoolConnection` and `DatabaseTransactionConnection`. Services import these from here, never from Slonik. How queries are written is in the [vertical slices](../../docs/patterns/vertical-slice.md) pattern.

### `Clock` and `systemClock`

`Clock` is the `clock` dependency's type, with `now(): Date`. `systemClock` reads the system time; `main.ts` passes it, and tests pass a fixed clock instead.

### `annotate(fields)`

Adds `fields` (string, number or boolean values) to every later log line of the current request. Outside a request it does nothing. It works with or without the OpenTelemetry SDK running. See [Share one observability context between logs and spans](../../docs/adr/0042-share-one-observability-context-between-logs-and-spans.md).

### `log` and `configureLog(options)`

`log` is the one pino logger every service imports. Until it's configured, it writes JSON at `info` to stdout.

`configureLog({ level, format, destination? })` sets its level and format (`json` or `pretty`), and optionally where it writes instead of stdout. `main.ts` calls it with the service's `config.log` before creating anything else.

### `startServer({ app, port, shutdownTimeoutMs?, onClose? })`

Serves `app` on `port` (`0` picks a free one) and resolves to `{ port, close }` once it's listening. On SIGTERM or SIGINT it stops accepting connections, drains requests in flight, then runs `onClose`, such as closing the database pool. It exits with 0 when nothing is left running, or 1 if that takes longer than `shutdownTimeoutMs` (10 seconds by default).

### `parseSettings(schema, source)`, `logSettings` and `ConfigError`

`parseSettings` validates `source` (usually `process.env`) against a zod schema and returns the parsed settings. On failure it throws a `ConfigError` that names each bad setting. `logSettings` holds `LOG_LEVEL` (default `info`) and `LOG_FORMAT` (default `json`), to spread into a service's settings schema.

### `@arcturus/service-runtime/telemetry`

The entry point a service's `dev` and `start` scripts load with `node --import`, before any application code. See [Start OpenTelemetry from service-runtime with Node's --import](../../docs/adr/0041-start-opentelemetry-from-service-runtime-with-import.md).

## Testing

From the repository root, with Docker running, `vp test packages/service-runtime`. The database and job tests use their own databases from [`@arcturus/test-database`](../test-database/README.md). The shutdown tests start a real server from `test/fixtures/server.ts`, following the [child process test](../../docs/patterns/child-process-test.md) pattern.
