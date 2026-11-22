---
type: adr
status: accepted
date: 2026-11-22
summary: Every TypeScript backend service sends traces and logs through OpenTelemetry over OTLP, depending only on the vendor-neutral API, so the production backend stays open until hosting is chosen; metrics are left off until wanted.
tags: [tech-stack, backend, observability]
---

# Use OpenTelemetry for backend traces and logs

## Context

The work of a match crosses several services and asynchronous steps. A game service queues a decision request, the player gateway delivers it to a player, the player answers, and the gateway calls the game service back, each step through a background job (see [Build Arcturus as services connected by HTTP](./0001-build-arcturus-as-services-connected-by-http.md) and [Run background jobs with graphile-worker](./0012-run-background-jobs-with-graphile-worker.md)). A question such as "why was this decision late?" can't be answered from one service's logs. It needs a trace that follows the decision across all of them.

There is no hosting provider yet, so no observability backend has been chosen for production. Arcturus is self-hostable, so operators will pick their own backend.

The maintainer doesn't need metrics yet. Traces and logs are enough for now, but adding metrics later should be easy.

## Decision

We will use OpenTelemetry for the telemetry of every TypeScript backend service (platform services, game services and agent services), exported as OTLP:

- **Traces and logs are sent from the start.**
- **Code depends only on `@opentelemetry/api` and OTel's semantic conventions**, never on a vendor's SDK.
- **Metrics are off.** Unless `OTEL_METRICS_EXPORTER` is set, the telemetry setup treats it as `none`, so no metric reader runs. Code may use the API's meters at any time: they do nothing until metrics are turned on.

## Consequences

- Any backend that accepts OTLP can be used in production, chosen once hosting is, with no code change.
- A decision can be followed end to end across services, as long as trace context is carried through jobs and HTTP calls (see [Trace each decision through jobs as its own trace](./0043-trace-each-decision-through-jobs-as-its-own-trace.md)).
- OTel's JavaScript SDK is verbose to set up, and its log and metric parts have changed between releases. The setup lives in one place, `service-runtime` (see [Start OpenTelemetry from service-runtime with Node's --import](./0041-start-opentelemetry-from-service-runtime-with-import.md)), so upgrades are made once.
- Turning metrics on later means setting `OTEL_METRICS_EXPORTER=otlp` and adding meters. The metrics worth having once that happens include decision latency, timeouts and retries, error-budget use, matches in progress and job queue depth. Metric attributes then need bounded cardinality, so per-player figures belong in traces and logs, not in labels.
- OTel's default is `otlp` for metrics, so our setup departs from the default. Someone reading the code needs this ADR to see why no metrics appear.

## Alternatives considered

- **A vendor SDK, such as Sentry or Datadog:** easier to set up, but it ties the project to one vendor, which works against self-hosting.
- **Logs only, with no tracing:** the least work, but it can't follow a decision across services and asynchronous jobs.
- **Standard metrics from the start (runtime and HTTP durations):** almost free, but data nobody has asked for yet.
