---
type: adr
status: accepted
date: 2026-11-23
summary: Each service's createApp starts from service-runtime's createServiceApp(), which installs request logging, the health endpoints and the error handler, so every service is wired the same way and a change to that wiring reaches all of them from one place.
tags: [backend, architecture]
---

# Build every service's app from one runtime factory

## Context

Every service is a Hono app built by its own `createApp(deps)` (see [Build every service with Hono, wired by hand](./0009-build-every-service-with-hono.md)). Some of what goes into that app is the same in every service and comes from `service-runtime`:

- the request-logging middleware, which writes one line per request and opens the per-request observability context (see [Log with pino, to stdout and OTLP](./0039-log-with-pino-to-stdout-and-otlp.md) and [Share one observability context between logs and spans](./0042-share-one-observability-context-between-logs-and-spans.md));
- the `/health/live` and `/health/ready` endpoints;
- the error handler that turns domain errors into problem details (see [Signal expected failures with thrown domain errors](./0024-signal-expected-failures-with-thrown-domain-errors.md)).

If each `createApp` installs these itself, then with several services to come (the platform services, every game service and the agent services), the same few lines are repeated in each, and their order matters. In Hono, middleware runs only for routes registered after it, so a service that mounts a router before the request-logging middleware loses logging and context for those routes without any error.

The decision is needed now because request logging is being added, and it is the second piece of shared wiring after the health endpoints.

## Decision

We will give `service-runtime` a factory, `createServiceApp()`, that returns a Hono app with the shared wiring already installed: request logging first, then the health endpoints, and the error handler. Each service's `createApp(deps)` starts from it and chains its own routers onto the result.

The parts it installs are not exported separately. The factory takes no options until a service needs to vary something.

## Consequences

- Every service gets the same middleware, health endpoints and error handling, in the right order, without having to know how they're put together.
- A change to that wiring, such as a new middleware, is made once in `service-runtime` and reaches every service.
- `app.ts` shows less of the service's skeleton. The [service composition root](../patterns/service-composition-root.md) pattern says what the factory installs.
- Dependencies are still wired by hand and passed through `createApp(deps)`, so this keeps to [Build every service with Hono, wired by hand](./0009-build-every-service-with-hono.md), which is about dependencies, not the app skeleton.
- Route types for the RPC client still infer, because services chain onto the app the factory returns.
- A service that needs different wiring adds an option to the factory rather than building its app without it. Options are added when that need arises, not up front.

## Alternatives considered

- **Each `createApp` installs the shared pieces itself** (`.use(requestLogging())`, `.route("/health", health())`, `.onError(...)`): the wiring is visible in every service, but repeated in each, and getting the order wrong silently drops logging and context for some routes. A change to the shared wiring would mean editing every service.
