# @arcturus/service-runtime

What every service shares at run time: the app skeleton with request logging and health checks, the database wrapper, the clock, the logger and its context fields, server start-up and graceful shutdown, settings parsing, and the OpenTelemetry entry point. Each service still owns its own configuration schema and wires its own dependencies.

How a service is put together with it is in the [service composition root](../../docs/patterns/service-composition-root.md) pattern, and how to log and annotate is in the [observability](../../docs/patterns/observability.md) pattern.

## Exports

### `createServiceApp({ db? })`

Returns the Hono app every service's `createApp(deps)` starts from, and chains its routers onto. It installs, in this order:

- **request logging:** one `"request completed"` line per request, with `method`, `route` (the matched route pattern, left out when nothing matched), `status` and `durationMs`. It's at `info`, or at `debug` for the health endpoints. Each request also gets its own scope for `annotate`.
- **the health endpoints:** `GET /health/live`, which always answers `{ status: "live" }`, and `GET /health/ready`. Readiness checks only the service's own database, when `db` is passed: it answers `503 { status: "not-ready" }` when `select 1` fails, and `{ status: "ready" }` otherwise.

Why every service starts from it is in [Build every service's app from one runtime factory](../../docs/adr/0049-build-every-services-app-from-one-runtime-factory.md).

### `createDatabase({ connectionString, lockTimeoutMs?, statementTimeoutMs? })` and `Database`

Opens a Slonik pool and resolves to `{ db, close }`. It connects straight away, so it rejects when the database is unreachable. `close` ends the pool; pass it to `startServer`'s `onClose`.

`db` is a `Database`, with only two methods: `transaction(routine)` runs `routine` with a connection inside a transaction, and `read(routine)` with a pooled connection outside one. It has no query methods of its own. Every connection has a lock timeout (5 seconds by default) and a statement timeout (30 seconds). Every row a query returns is validated against its `sql.type` schema, `timestamp` and `timestamptz` columns are read as `Date`, and a query on another connection while a transaction is open in the same request throws. How handlers use it is in the [database transactions](../../docs/patterns/database-transaction.md) pattern.

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

From the repository root, with Docker running, `vp test packages/service-runtime`. The database tests use their own databases from [`@arcturus/test-database`](../test-database/README.md). The shutdown tests start a real server from `test/fixtures/server.ts`, following the [child process test](../../docs/patterns/child-process-test.md) pattern.
