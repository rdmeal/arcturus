---
type: pattern
summary: Use when service code logs, adds context to logs and traces, or creates a span — import log from service-runtime, annotate the domain IDs a handler acts on, log at the level whose meaning fits, keep sensitive data out, and add spans with withSpan only for slow work nothing else traces.
tags: [backend, observability]
---

# Observability

Services log with pino and trace with OpenTelemetry, both set up by `service-runtime`. Slice code does very little itself. It logs through one imported logger, and records which tournament, match, seat or player it is working on, so every log line and span carries those fields. Everything else is done by the runtime.

## When to use it

- Writing a log line in any service: a platform service, a game service or an agent service.
- Writing a handler for a command, query or job that acts on a tournament, match, seat or player.
- Measuring work that may be slow and that no request, outbound call, query or job span already covers.

## When not to

- Recording what players were asked and what they answered. That is the decision log, the player gateway's domain data, stored in its database. It is not a service log.
- Request logging, server spans, job spans, error recording and trace propagation. `service-runtime` does all of these. Don't add your own.
- Metrics. They are off for now (see [Use OpenTelemetry for backend traces and logs](../adr/0038-use-opentelemetry-for-backend-telemetry.md)).

## Rules

### Logging

1. Log only through `log`, imported from `@arcturus/service-runtime`. Never create a pino logger, use `console`, or take a logger from `deps` or Hono's context.
2. Log a message string, with structured fields for its details (`log.warn({ code }, 'Player timed out')`). Never build the details into the message by string concatenation.
3. Choose the level by its meaning:
   - `error`: a bug, or an infrastructure failure, that someone needs to look at;
   - `warn`: something expected but worth noticing, such as a player timing out or a job attempt that will be retried;
   - `info`: lifecycle, such as startup and shutdown;
   - `debug`: detail for local investigation, off by default.
4. Don't log a domain error that is answered over HTTP above `debug`. It is a normal response, and the request's span already records its status.
5. Don't log requests, job attempts, 500s or final job failures yourself. `service-runtime` already logs them at the levels above, and records errors on the active span: requests through the request logging `createServiceApp()` installs, 500s through its error handler, and jobs through `defineTask`. Request logging writes one `info` line per request, with its method, matched route, status and duration.
6. Health check requests (`/health/live` and `/health/ready`) are logged at `debug`, not `info`, so frequent probes don't drown the request lines. They show in tests and with `LOG_LEVEL=debug`.

### Context

7. As soon as a handler's input is validated, call `annotate` with the domain IDs it acts on (`tournamentId`, `matchId`, `seat`, `playerId`). In a job, take them from the payload. Every later log line and the active span then carry them.
8. Name context fields with the glossary's terms, in camelCase (`matchId`, never `match_id` or `gameRunId`). `annotate` adds the `arcturus.` prefix and snake case on spans for you.
9. Don't annotate the fields `service-runtime` adds itself: for jobs, `jobId`, `taskName` and `attempt`.
10. Annotate IDs and small, bounded values only. Never annotate whole objects, states or lists.

### What never goes in logs or spans

11. Never log or annotate request or response bodies, decision requests or actions, game states, secrets, tokens or credentials. pino's `redact` removes `authorization` and cookie headers as a safety net, not as permission to log them.
12. A player's endpoint URL may be logged, with its query string removed, since the query string may hold a key.
13. To log an error, pass the error itself as the `err` field and let pino serialise it. Never copy its stack trace into the message.

### Spans

14. Don't create a span for a handler, a query or an outbound call: the request or job span already is the handler, and the instrumentations cover queries and calls.
15. Create a span only around work that none of those cover and that may be slow, such as evaluating a game's rules, with `withSpan(name, fn)` from `service-runtime`.
16. Name such a span `<area>.<slice> <step>` (`match-play.apply-action evaluate-rules`). Never put an ID in a span name. IDs belong in the context (rule 7).

## Exemplar

No service annotates yet, so the exemplar is the runtime itself, and one test of a log line:

- `packages/service-runtime/src/context.ts`, `annotate` and `withContextFields`: the fields kept in the active OpenTelemetry context, which pino's `mixin` reads (in `log.ts`).
- `packages/service-runtime/src/service-app.ts`, `createServiceApp` and its request logging: one line per request, at `debug` for health requests, with a context scope opened for each request.
- `services/example/src/request-log.test.ts`: a test whose subject is the logging, asserting its line with `captureLogs`.

## Related

- [Use OpenTelemetry for backend traces and logs](../adr/0038-use-opentelemetry-for-backend-telemetry.md)
- [Log with pino, to stdout and OTLP](../adr/0039-log-with-pino-to-stdout-and-otlp.md)
- [Start OpenTelemetry from service-runtime with Node's --import](../adr/0041-start-opentelemetry-from-service-runtime-with-import.md)
- [Share one observability context between logs and spans](../adr/0042-share-one-observability-context-between-logs-and-spans.md)
- [Build every service's app from one runtime factory](../adr/0049-build-every-services-app-from-one-runtime-factory.md)
- [Trace each decision through jobs as its own trace](../adr/0043-trace-each-decision-through-jobs-as-its-own-trace.md)
- [Background jobs](./background-job.md): trace context and context fields in jobs.
- [Error handling](./error-handling.md): which failures are domain errors.
- [Service composition root](./service-composition-root.md): how telemetry is started.
- [Service API tests](./service-api-test.md): logs in tests.
