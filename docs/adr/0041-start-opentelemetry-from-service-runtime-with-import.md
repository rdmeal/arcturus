---
type: adr
status: accepted
date: 2026-11-22
summary: Each service loads service-runtime's telemetry entry point with --import, before any application code, which enables an explicit list of instrumentations and reads OTel's standard OTEL_* variables, a narrow exception to config-module-only configuration.
tags: [backend, observability]
---

# Start OpenTelemetry from service-runtime with Node's --import

## Context

OpenTelemetry's Node instrumentations work by patching modules such as `node:http`, `pg` and `pino` as they load. Services are ESM and run from source (see [Run TypeScript source directly](./0018-run-typescript-source-directly.md)), so the SDK has to be loaded with Node's `--import` flag, before `main.ts` and its static imports. If it starts later, the modules already loaded are never patched, and nothing warns about it.

So the SDK starts before the service's `config.ts` runs. Under [Load configuration only in each service's config module](./0031-load-configuration-only-in-each-services-config-module.md), `config.ts` is the only code that knows where configuration comes from. The OTel SDK, however, reads its own standard `OTEL_*` environment variables (exporter endpoint, service name, sampler, and so on), and so does every OTel deployment.

OTel offers `@opentelemetry/auto-instrumentations-node`, which turns on about 40 instrumentations and installs all of them. Services need only a few: incoming and outgoing HTTP, Node's `fetch` (which service clients use), Postgres through Slonik, and pino. Hono's `@hono/otel` middleware starts its own server span, so used alongside the HTTP instrumentation it gives two server spans per request.

Every service already shares `packages/service-runtime` for its lifecycle and health checks (see the [Service composition root](../patterns/service-composition-root.md) pattern).

## Decision

We will start OpenTelemetry from a `telemetry` entry point in `service-runtime`:

- **Each service's `dev` and `start` scripts run `node --import @arcturus/service-runtime/telemetry src/main.ts`.**
- **The entry point sets `service.name` and `service.version` from the service's `package.json`.** Everything else comes from OTel's standard `OTEL_*` variables, which the SDK reads itself. This is a narrow exception to configuration living only in `config.ts`, limited to the standard `OTEL_*` variables.
- **The entry point enables an explicit list of instrumentations:** `instrumentation-http`, `instrumentation-undici`, `instrumentation-pg` and `instrumentation-pino`.
- **`service-runtime`'s app setup names each request's server span from Hono's matched route** (`POST /tournament-setup/create-tournament`) and sets `http.route`, instead of using `@hono/otel`.
- **Graceful shutdown flushes and shuts down the SDK as its last step**, inside the same hard timeout.

## Consequences

- Locally, nothing needs configuring: OTLP's default endpoint, `localhost:4318`, is the local backend (see [Run grafana/otel-lgtm as the local observability backend](./0040-run-otel-lgtm-as-the-local-observability-backend.md)). Production sets the `OTEL_*` variables as any OTel deployment would, including the sampler. Until then, every trace is kept.
- Two places now read configuration: `config.ts` for the service's own settings, and the SDK for `OTEL_*`. Nothing else may be added to the telemetry entry point's configuration.
- A service started without `--import` runs normally, but without telemetry. Tests rely on this: they run without the SDK.
- Only the instrumentations listed are installed, which keeps dependencies down (see [Guard the dependency supply chain](./0020-guard-the-dependency-supply-chain.md)) and leaves out noisy `fs`, `dns` and `net` spans. A new kind of outbound call or database needs its instrumentation added to the list.
- graphile-worker has no OTel instrumentation, so `service-runtime` creates the job spans itself (see [Trace each decision through jobs as its own trace](./0043-trace-each-decision-through-jobs-as-its-own-trace.md)).
- The spans and logs from the shutdown itself are exported, which matters most when a service is crash-looping.

## Alternatives considered

- **Starting the SDK in `main.ts` after `loadConfig()`, then loading the app with a dynamic `import()`:** keeps configuration in `config.ts` alone, but every `main.ts` becomes unusual, and anything imported before the SDK starts goes uninstrumented without any warning.
- **Having the telemetry entry point load the env files with dotenv:** two modules would then know about env files, which is what config-module-only loading prevents.
- **`@opentelemetry/auto-instrumentations-node`:** about 40 instrumentations as dependencies, most unused, and noisy spans.
- **`@hono/otel`:** two server spans per request alongside the HTTP instrumentation, and another dependency, to save a few lines of code.
