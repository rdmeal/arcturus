---
type: ticket
status: done
blocked-by: ["01", "10"]
scopes: [arcturus]
---

# 04: Every request is logged, and annotated IDs reach every log line

Part of [the spec](../spec.md); delivers user stories 10 and 11 (for requests).

## What to build

- **One line per request:** every request to a service produces one `info` log line with its method, matched route, status and duration. The health endpoints are included unless planning finds a reason to quieten them.
- **Annotated IDs:** a handler can annotate the IDs it acts on, and every log line written afterwards in that request carries them. This works whether or not the OpenTelemetry SDK is running, so it behaves the same in tests as in production.
- **Asserting a log line:** the test harness gains `captureLogs`, which gives a test the log records written during that test only, for the rare test where the log line is the behaviour.

The example service shows this with a test that asserts its request log line through `captureLogs`.

## Acceptance criteria

- [ ] A request to the example service produces exactly one `info` line with method, matched route, status and duration.
- [ ] A field annotated during a request appears on every later log line of that request, and on no line of a concurrent request.
- [ ] Annotated fields reach log lines with no OTel SDK running, as in tests.
- [ ] `captureLogs` returns only the records written during the test that asked for it, even when other tests run in the same worker.
- [ ] The observability pattern's exemplar names the example service's use of annotation, or the runtime's middleware if the service has no annotating handler yet.

## Notes

- **Settled when planning:**
  - how `annotate` works without the SDK: `service-runtime` registering an `AsyncLocalStorageContextManager` when the SDK hasn't, or keeping its own AsyncLocalStorage alongside;
  - where the mutable per-request scope opens, since OTel contexts are immutable;
  - how the route name is read from Hono (for example `routePath(c)` from `hono/route`, since `c.req.routePath` changed between versions), checked against Hono's current docs.
- **Spans aren't touched here:** setting annotated fields on the active span is tested in ticket 09, when the SDK is configured.
- **Decisions:**
  - [Share one observability context between logs and spans](../../../../docs/adr/0042-share-one-observability-context-between-logs-and-spans.md)
  - [Log with pino, to stdout and OTLP](../../../../docs/adr/0039-log-with-pino-to-stdout-and-otlp.md)
- **Patterns:** [observability](../../../../docs/patterns/observability.md), [service API tests](../../../../docs/patterns/service-api-test.md) rules 18–19.
