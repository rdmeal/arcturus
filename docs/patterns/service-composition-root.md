---
type: pattern
summary: Use when creating a service or adding a dependency or setting to one — config loaded and validated only in config.ts, deps built in main.ts and passed to createApp(deps), lifecycle, health and telemetry from service-runtime.
tags: [backend]
---

# Service composition root

Every service builds its dependencies by hand in one place, at startup, and passes them down as a plain object. There is no DI container: the dependency graph is ordinary code, checked by the compiler. Configuration is loaded and validated in one module, so nothing else knows where a setting came from.

## When to use it

- Creating a new service: a platform service, a game service or an agent service.
- Adding a dependency to an existing service: a client for another service, a clock.
- Adding a setting to an existing service.

## Rules

### Files

1. A service's top-level files are `src/main.ts`, `src/config.ts`, `src/app.ts` and, if it has jobs, `src/tasks.ts`. Everything else is in areas and slices (see [Vertical slices](./vertical-slice.md)).

### Configuration

2. `src/config.ts` holds one zod schema for the service's configuration and exports two functions. `loadConfig()` loads the env files, reads the environment (and, for the tournament runner, the operator config file), validates everything with the schema, failing fast with readable messages, and returns a typed, frozen config object. `parseConfig(source)` validates a plain object and touches no files or environment, so tests use it.
3. Nothing outside `config.ts` reads `process.env`, an env file or the config file. `main.ts` calls `loadConfig()` once, and code that needs a setting gets it through `deps.config`. The one exception is the OpenTelemetry SDK, which reads OTel's standard `OTEL_*` variables itself (rule 20). Never add other settings to it.
4. Env files are loaded with dotenv into a plain object (`processEnv: {}`, `quiet: true`), never into `process.env`. Validate the file values with the real environment laid over them, so the precedence is: real environment variables, then `.env`, then `.env.development`.
5. Find the env files from the service's package folder (`import.meta.dirname`), never from `process.cwd()`. A missing file is skipped. Never check `NODE_ENV` to decide whether to load them.
6. Every service with settings commits a `.env.development` holding every value it needs to run locally, so it starts straight after a clone. Personal overrides go in a git-ignored `.env` in the same folder.
7. Required settings have no defaults in the schema. Local values, such as the tournament runner's path to the example operator config, go in `.env.development`, so a deployment that forgets a setting fails at startup instead of running with a local value.
8. An optional setting may have a default in the schema only when that value is right in every deployment, so forgetting it does no harm. `LOG_LEVEL` defaults to `info` and `LOG_FORMAT` to `json`. A service's `.env.development` sets `LOG_FORMAT=pretty`.
9. Secrets come from environment variables or mounted files. Never put one in a config file or in `.env.development`, whose values are committed.
10. A service's local port is allocated in the ports table in [Local development](../develop/local-development.md). The port in `.env.development` has a comment linking to that table.

### Dependencies

11. `main.ts` creates every dependency: the database (`service-runtime`'s wrapper, see [Database transactions](./database-transaction.md)), the clock, and a client for each service it calls. It then calls `createApp(deps)` and starts the HTTP server and the job worker through `service-runtime`. Before creating anything, it passes `config.log` to `configureLog`. If `loadConfig()` throws a `ConfigError`, `main.ts` logs it with `log.fatal` and sets `process.exitCode = 1`.
12. `src/app.ts` defines the `Deps` type, a plain object type listing every dependency, and `createApp(deps)`, which chains each area's router and returns the Hono app. It exports `AppType` for the RPC client.
13. Dependencies reach slices only through factories: route factories, task definitions and handlers take `deps` as an argument. Never use Hono context variables or module-level singletons for dependencies. The one exception is the logger, which code imports from `service-runtime` (see [Observability](./observability.md)).
14. Time comes from a `clock` dependency with `now()`, so tests can fix it. Code never calls `new Date()` or `Date.now()` for a time its logic uses.
15. Every outbound call to another service goes through a client in `deps`. Nothing below a handler builds its own `fetch` call. (What these clients look like is decided with the protocols.)

### Lifecycle and health

16. The HTTP server and the job worker run in the same process, started from the same `main.ts`.
17. Lifecycle comes from `packages/service-runtime`: starting the server, graceful shutdown on SIGTERM and SIGINT (stop accepting connections, drain requests in flight, stop the worker, end the pool, then flush and shut down telemetry, all within a hard timeout), and the health endpoints. Services don't write their own. `service-runtime` doesn't load config; each service owns its schema.
18. Every service exposes `/health/live`, which checks nothing and answers if the process is up, and `/health/ready`, which checks only the service's own database and worker. Neither checks other services, so one service going down never marks the others unready. Neither is exposed through the reverse proxy.
19. A service without a database (most agent services) uses only the server, shutdown and health parts of `service-runtime`. Its readiness then checks nothing.

### Telemetry

20. A service's `dev` and `start` scripts run `node --import @arcturus/service-runtime/telemetry src/main.ts`, so OpenTelemetry starts before any application code loads. The entry point takes the service's name and version from its `package.json`, so a service adds no telemetry settings of its own. Every service uses it, with or without a database.

## Exemplar

The example service, which is temporary and has no database or clients yet:

- `services/example/src/config.ts`, `parseConfig` and `loadConfig`: the schema with `logSettings`, the frozen camelCase config, and the env files loaded from the package folder into a plain object.
- `services/example/src/app.ts`, `Deps` and `createApp`: the health endpoints mounted from `service-runtime`, and `AppType`.
- `services/example/src/main.ts`: `loadConfig()`, `configureLog`, `startServer`, and a `ConfigError` logged as fatal.
- `services/example/package.json`: the `dev` and `start` scripts with the telemetry `--import`.

## Related

- [Build every service with Hono, wired by hand](../adr/0009-build-every-service-with-hono.md)
- [Load configuration only in each service's config module](../adr/0031-load-configuration-only-in-each-services-config-module.md)
- [Start OpenTelemetry from service-runtime with Node's --import](../adr/0041-start-opentelemetry-from-service-runtime-with-import.md)
- [Log with pino, to stdout and OTLP](../adr/0039-log-with-pino-to-stdout-and-otlp.md)
- [Observability](./observability.md)
- [Vertical slices](./vertical-slice.md)
- [Database transactions](./database-transaction.md)
- [Background jobs](./background-job.md)
- [Database migrations](./database-migration.md): the migration scripts read the same env files.
