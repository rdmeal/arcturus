---
type: ticket
status: ready
blocked-by: ["08"]
scopes: [arcturus]
---

# 09: A message's whole trace shows in local Grafana

Part of [the spec](../spec.md); delivers user stories 12, 13, 14 (otel-lgtm) and 26 (Grafana).

## What to build

A contributor sends a message to the running example service, opens Grafana, and finds one trace containing, with every log line linked to its span:

- the request;
- its queries;
- the delivery job;
- the job's outbound call;
- the inbox request that call caused.

To make that work:

- **The telemetry entry point** grows from the bare one in ticket 01 into the real one: it enables an explicit list of instrumentations, reads the standard `OTEL_*` variables, names server spans after the matched route, and leaves metrics off unless `OTEL_METRICS_EXPORTER` is set.
- **Compose** runs the otel-lgtm container alongside Postgres.
- **Jobs continue the trace that queued them.** A job queued with `newTrace` starts a new trace linked to its cause instead.
- **Annotated fields** are set on the active span as well as on log lines.

## Acceptance criteria

- [ ] `vp run infra:up` starts otel-lgtm, digest-pinned, with Grafana on port 3300 and OTLP on 4317 and 4318. `infra:up` still waits only for Postgres.
- [ ] Manual check, recorded in the pull request: with `vp run dev` running, sending one message produces a single trace in Grafana with the request, queries, the job, the outbound `fetch` and the inbox request, with log lines linked. This confirms that the ESM instrumentation patches `pg` and `pino` under type stripping, and that `fetch` is instrumented.
- [ ] Server spans are named after the matched route, with `http.route` set.
- [ ] Metrics are off unless `OTEL_METRICS_EXPORTER` is set, without the service writing to `process.env`.
- [ ] The runtime's own tests, using an in-memory span exporter, show that:
  - HTTP → job → HTTP is one trace;
  - a `newTrace` job starts a new trace with a link to its cause;
  - retries appear as sibling spans;
  - annotated fields reach the span.
- [ ] No payload schema can define the reserved trace key, and handlers never see it.
- [ ] Telemetry is flushed last at shutdown.
- [ ] The local development guide says where to open Grafana and where to find traces and logs.

## Notes

- **Settled when planning:**
  - whether `addJob` creates a short producer span for a `newTrace` job, and what the new trace's root span is called;
  - how the empty metric reader list is passed to the SDK;
  - how pino's instrumentation sees the logger configured in ticket 01.
- **No service sets telemetry settings of its own:** the entry point takes the service's name and version from its `package.json`.
- **Decisions:**
  - [Use OpenTelemetry for backend traces and logs](../../../../docs/adr/0038-use-opentelemetry-for-backend-telemetry.md)
  - [Run grafana/otel-lgtm as the local observability backend](../../../../docs/adr/0040-run-otel-lgtm-as-the-local-observability-backend.md)
  - [Start OpenTelemetry from service-runtime with Node's --import](../../../../docs/adr/0041-start-opentelemetry-from-service-runtime-with-import.md)
  - [Share one observability context between logs and spans](../../../../docs/adr/0042-share-one-observability-context-between-logs-and-spans.md)
  - [Trace each decision through jobs as its own trace](../../../../docs/adr/0043-trace-each-decision-through-jobs-as-its-own-trace.md)
- **Patterns:** [observability](../../../../docs/patterns/observability.md), [background jobs](../../../../docs/patterns/background-job.md) rules 11–13.
