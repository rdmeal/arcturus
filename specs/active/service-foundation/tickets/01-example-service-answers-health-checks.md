---
type: ticket
status: done
blocked-by: []
scopes: [arcturus]
---

# 01: Example service answers health checks under test

Part of [the spec](../spec.md); delivers user stories 1, 2 (liveness), 3, 9 and 17 (the client fixture).

## What to build

This is the database-free tracer, and the first code in the new stack. It proves that a service can run its TypeScript source, and that of its workspace libraries, through pnpm's symlinks, before anything depends on that.

- **Running it:** a contributor runs the example service with its `dev` script. It starts in watch mode with a bare telemetry entry point loaded through `--import` from the shared runtime, and logs that it is listening.
- **Health checks:** `/health/live` answers whenever the process is up. `/health/ready` answers ready, because the service has no database or worker yet.
- **Logging:** the service logs through the logger it imports from the runtime. The output is JSON by default, and pretty locally because its `.env.development` sets the format.
- **Shutdown:** on SIGTERM or SIGINT it stops accepting connections, drains requests in flight and exits within a hard timeout.
- **Tests:** the shared test harness gives the service its own `test` with a `client` fixture, which builds the app from test configuration. A first API test calls `/health/live` through it. Logs written during tests go through `console`, pretty-printed, so Vitest shows them only for failing tests.

The example service follows the service composition root pattern from its first file. It has its own config module, `createApp(deps)` and a `main.ts` that wires everything. It has no slices yet.

## Acceptance criteria

- [ ] The example service's `dev` script starts it with the runtime's telemetry entry point loaded through `--import`, and the service runs from `.ts` source, including the runtime's, with no build step.
- [ ] `/health/live` and `/health/ready` both answer success on a running service.
- [ ] The runtime's own tests start a real server and show that a request in flight when SIGTERM arrives completes, that new connections are refused, and that the process exits within the hard timeout.
- [ ] The example service's API test calls `/health/live` through the `client` fixture, with configuration built by `parseConfig` from test values, never from env files or `process.env`.
- [ ] `LOG_LEVEL` defaults to `info` and `LOG_FORMAT` to `json` when unset. The service's `.env.development` sets `LOG_FORMAT=pretty`. An invalid value fails start-up with a readable message.
- [ ] `vp test` runs the workspace packages' tests through Vitest projects in the root config, and `passWithNoTests` is gone.
- [ ] `vp check` passes.
- [ ] The ports table in the local development guide lists the example service on 3900, marked temporary. Its `.env.development` port links to that table.
- [ ] The codebase guide names `packages/service-runtime` and `packages/service-testing`.
- [ ] The service composition root pattern's exemplar names the example service's composition root.

## Notes

- **Settled when planning:**
  - how the logger is reconfigured after `loadConfig()`, what it does before that, and how pino's OTel instrumentation will still see the instance when it arrives in ticket 09;
  - how the harness redirects the logger without a production code path changing;
  - the shape of the per-service `test` factory (for example `createServiceTest({ createApp, parseConfig, … })`) and the file it lives in, then update rule 4 of the service API test pattern to match;
  - the shutdown timeout.
- **The telemetry entry point stays bare here.** Instrumentations and exporters come in ticket 09. This ticket only proves that `--import` of a `.ts` entry point resolves through the package's `exports` behind the symlink.
- **Secrets and `.env.development`:** Claude can't read `.env.development` files. List the keys and values this ticket needs, and the maintainer writes the file.
- **Pitfall:** the `.env.development` keys are `PORT`, `LOG_LEVEL` (optional) and `LOG_FORMAT`. Required settings get no defaults (see [Load configuration only in each service's config module](../../../../docs/adr/0031-load-configuration-only-in-each-services-config-module.md)).
- **Decisions:**
  - [Build every service with Hono, wired by hand](../../../../docs/adr/0009-build-every-service-with-hono.md)
  - [Run TypeScript source directly, with no build step](../../../../docs/adr/0018-run-typescript-source-directly.md)
  - [Start OpenTelemetry from service-runtime with Node's --import](../../../../docs/adr/0041-start-opentelemetry-from-service-runtime-with-import.md)
  - [Log with pino, to stdout and OTLP](../../../../docs/adr/0039-log-with-pino-to-stdout-and-otlp.md)
  - [Test services mostly through their API, in-process](../../../../docs/adr/0032-test-services-through-their-api.md)
- **Patterns:** [service composition root](../../../../docs/patterns/service-composition-root.md), [service API tests](../../../../docs/patterns/service-api-test.md).
