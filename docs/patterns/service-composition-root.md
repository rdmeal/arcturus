---
type: pattern
summary: Use when creating a service or adding a dependency to one — config parsed once in main.ts, deps built there and passed to createApp(deps), lifecycle and health from service-runtime.
tags: [backend]
---

# Service composition root

Every service builds its dependencies by hand in one place, at startup, and passes them down as a plain object. There is no DI container: the dependency graph is ordinary code, checked by the compiler.

## When to use it

- Creating a new service: a platform service, a game service or an agent service.
- Adding a dependency to an existing service: a client for another service, a clock, a new setting.

## Rules

1. A service's top-level files are `src/main.ts`, `src/config.ts`, `src/app.ts` and, if it has jobs, `src/tasks.ts`. Everything else is in areas and slices (see [Vertical slices](./vertical-slice.md)).
2. `src/config.ts` holds one zod schema for the service's configuration. `main.ts` parses it once at startup from environment variables (and, for the tournament runner, the operator config file), failing fast with readable messages. The result is a typed, frozen config object.
3. Nothing outside `main.ts` reads `process.env`. Code that needs a setting gets it through `deps.config`.
4. Secrets come from environment variables or mounted files, never from a config file.
5. `main.ts` creates every dependency: the database (`service-runtime`'s wrapper, see [Database transactions](./database-transaction.md)), the clock, and a client for each service it calls. It then calls `createApp(deps)` and starts the HTTP server and the job worker through `service-runtime`.
6. `src/app.ts` defines the `Deps` type, a plain object type listing every dependency, and `createApp(deps)`, which chains each area's router and returns the Hono app. It exports `AppType` for the RPC client.
7. Dependencies reach slices only through factories: route factories, task definitions and handlers take `deps` as an argument. Never use Hono context variables or module-level singletons for dependencies.
8. Time comes from a `clock` dependency with `now()`, so tests can fix it. Code never calls `new Date()` or `Date.now()` for a time its logic uses.
9. Every outbound call to another service goes through a client in `deps`. Nothing below a handler builds its own `fetch` call. (What these clients look like is decided with the protocols.)
10. The HTTP server and the job worker run in the same process, started from the same `main.ts`.
11. Lifecycle comes from `packages/service-runtime`: starting the server, graceful shutdown on SIGTERM and SIGINT (stop accepting connections, drain requests in flight, stop the worker, end the pool, with a hard timeout), and the health endpoints. Services don't write their own. `service-runtime` doesn't load config; each service owns its schema.
12. Every service exposes `/health/live`, which checks nothing and answers if the process is up, and `/health/ready`, which checks only the service's own database and worker. Neither checks other services, so one service going down never marks the others unready. Neither is exposed through the reverse proxy.
13. A service without a database (most agent services) uses only the server, shutdown and health parts of `service-runtime`. Its readiness then checks nothing.

## Exemplar

None yet: established by the first ticket that uses it.

## Related

- [Build every service with Hono, wired by hand](../adr/0009-build-every-service-with-hono.md)
- [Vertical slices](./vertical-slice.md)
- [Database transactions](./database-transaction.md)
- [Background jobs](./background-job.md)
