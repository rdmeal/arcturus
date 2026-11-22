---
type: adr
status: accepted
date: 2026-11-22
summary: Services log structured JSON with pino, written to stdout and sent over OTLP by OpenTelemetry's pino instrumentation, which also adds trace and span IDs, through one logger imported from service-runtime.
tags: [tech-stack, backend, observability]
---

# Log with pino, to stdout and OTLP

## Context

Backend telemetry goes through OpenTelemetry (see [Use OpenTelemetry for backend traces and logs](./0038-use-opentelemetry-for-backend-telemetry.md)). OTel defines a logs API, but it is meant for log libraries to build on, not for everyday logging: it has no convenient levels, no child loggers and no readable local output.

pino is the most widely used structured logger for Node. OpenTelemetry's `@opentelemetry/instrumentation-pino` adds `trace_id`, `span_id` and `trace_flags` to every record logged inside a span. By default it also sends each record to the OTel Logs SDK, so no separate log shipper is needed.

Locally, an OTLP collector may or may not be running (see [Run grafana/otel-lgtm as the local observability backend](./0040-run-otel-lgtm-as-the-local-observability-backend.md)). Logs must still be visible when it isn't.

Dependencies reach a service's code through `deps`, built in `main.ts` (see the [Service composition root](../patterns/service-composition-root.md) pattern). Tests check behaviour through the API, not through logs (see [Test services through their API](./0032-test-services-through-their-api.md)).

## Decision

We will log with pino:

- **Every service writes JSON logs to stdout** and also sends them over OTLP through the pino instrumentation. `LOG_FORMAT` (`json` by default, `pretty` locally, through `pino-pretty`) and `LOG_LEVEL` are ordinary settings, loaded by the service's `config.ts`.
- **Code imports one logger from `service-runtime`** (`import { log } from '@arcturus/service-runtime'`) instead of receiving it in `deps`. This is a named exception to passing every dependency through `deps`, like OTel's global tracer.
- **Request logging is our own small middleware in `service-runtime`**, which writes one line per request.

## Consequences

- Every log line written inside a request or job carries its trace and span IDs, so Grafana can jump from a log line to its trace.
- Logs stay visible on stdout when no collector is running. When the collector is down, OTel's exporters retry, drop the data and warn once, and the service carries on.
- Locally, logs reach both the terminal and Loki. In production, one of the two outputs will probably be dropped once hosting is decided.
- Log correlation and log sending depend on the OTel SDK loading before pino, through `--import` (see [Start OpenTelemetry from service-runtime with Node's --import](./0041-start-opentelemetry-from-service-runtime-with-import.md)).
- A test that wants to check a log line can't inject a fake logger, so it has to capture the logger's output.
- How code logs (levels, what never to log, the fields every line carries) is set out in the [observability pattern](../patterns/observability.md).

## Alternatives considered

- **LogTape:** no dependencies, with implicit contexts built in and an OTel sink. But it is less widely used, its OTel integration doesn't come from the OTel project, and pino's `mixin` gives the same implicit context (see [Share one observability context between logs and spans](./0042-share-one-observability-context-between-logs-and-spans.md)).
- **The OTel logs API directly:** no extra library, but poor for everyday logging.
- **winston:** slower than pino, with nothing to make up for it.
- **OTLP only:** nothing to see when the collector is down.
- **Stdout only, with a collector reading container logs:** locally, services run on the host, so nothing would collect their output.
- **`hono-pino` for request logging:** it hands the logger out through Hono context variables, but code here imports the logger instead.
- **Passing the logger in `deps`:** consistent with how other dependencies are passed, but it adds noise to every factory, and tests don't need to swap the logger out.
