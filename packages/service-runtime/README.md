# @arcturus/service-runtime

What every service shares at run time: the app skeleton with request logging and health checks, the logger and its context fields, server start-up and graceful shutdown, settings parsing, and the OpenTelemetry entry point. Each service still owns its own configuration schema and wires its own dependencies.

How a service is put together with it is in the [service composition root](../../docs/patterns/service-composition-root.md) pattern, and how to log and annotate is in the [observability](../../docs/patterns/observability.md) pattern.

## Exports

### `createServiceApp()`

Returns the Hono app every service's `createApp(deps)` starts from, and chains its routers onto. It installs, in this order:

- **request logging:** one `"request completed"` line per request, with `method`, `route` (the matched route pattern, left out when nothing matched), `status` and `durationMs`. It's at `info`, or at `debug` for the health endpoints. Each request also gets its own scope for `annotate`.
- **the health endpoints:** `GET /health/live` and `GET /health/ready`.

Why every service starts from it is in [Build every service's app from one runtime factory](../../docs/adr/0049-build-every-services-app-from-one-runtime-factory.md).

### `annotate(fields)`

Adds `fields` (string, number or boolean values) to every later log line of the current request. Outside a request it does nothing. It works with or without the OpenTelemetry SDK running. See [Share one observability context between logs and spans](../../docs/adr/0042-share-one-observability-context-between-logs-and-spans.md).

### `log` and `configureLog(options)`

`log` is the one pino logger every service imports. Until it's configured, it writes JSON at `info` to stdout.

`configureLog({ level, format, destination? })` sets its level and format (`json` or `pretty`), and optionally where it writes instead of stdout. `main.ts` calls it with the service's `config.log` before creating anything else.

### `startServer({ app, port, shutdownTimeoutMs? })`

Serves `app` on `port` (`0` picks a free one) and resolves to `{ port, close }` once it's listening. On SIGTERM or SIGINT it stops accepting connections and drains requests in flight. It exits with 0 when nothing is left running, or 1 if that takes longer than `shutdownTimeoutMs` (10 seconds by default).

### `parseSettings(schema, source)`, `logSettings` and `ConfigError`

`parseSettings` validates `source` (usually `process.env`) against a zod schema and returns the parsed settings. On failure it throws a `ConfigError` that names each bad setting. `logSettings` holds `LOG_LEVEL` (default `info`) and `LOG_FORMAT` (default `json`), to spread into a service's settings schema.

### `@arcturus/service-runtime/telemetry`

The entry point a service's `dev` and `start` scripts load with `node --import`, before any application code. See [Start OpenTelemetry from service-runtime with Node's --import](../../docs/adr/0041-start-opentelemetry-from-service-runtime-with-import.md).

## Testing

From the repository root, `vp test packages/service-runtime`. The shutdown tests start a real server from `test/fixtures/server.ts`, following the [child process test](../../docs/patterns/child-process-test.md) pattern.
