---
type: adr
status: accepted
date: 2026-11-22
summary: service-runtime's annotate() stores fields such as matchId in the active OpenTelemetry Context and on the active span, and pino's mixin adds them to every log record, so logs and traces carry the same fields without passing a logger around; Baggage is not used.
tags: [backend, observability]
---

# Share one observability context between logs and spans

## Context

A log line is much more useful when it says which tournament, match, seat or player it concerns. Passing those fields to every log call by hand is tedious, and any call that forgets them loses them. The same fields are also wanted on spans, so traces can be searched by match.

Code logs through one logger imported from `service-runtime` (see [Log with pino, to stdout and OTLP](./0039-log-with-pino-to-stdout-and-otlp.md)). OpenTelemetry's Context API already carries the active span through `await`, using AsyncLocalStorage underneath. pino's `mixin` option adds fields to every record from a function called at log time.

OTel's Baggage also carries key-value pairs in the context, and sends them to other services in a `baggage` header on every outbound call. That includes calls from the player gateway to players, who are untrusted (see [Co-host game services and register players at runtime](./0005-co-host-game-services-and-register-players-at-runtime.md)).

## Decision

We will give `service-runtime` a small observability-context API:

- **`annotate({ matchId, seat })`** stores the fields in the active OTel Context and sets them as attributes on the active span.
- **pino's `mixin` reads them into every log record**, so the imported logger picks them up without any argument.
- **For jobs, `service-runtime` adds `jobId`, `taskName` and `attempt` automatically.** Handlers annotate the domain IDs they act on themselves, once their input is validated.
- **Fields are named with the glossary's terms:** camelCase in logs (`matchId`), and `arcturus.`-prefixed snake_case on spans (`arcturus.match_id`), following OTel's rules for custom attributes.
- **Baggage is not used.**

## Consequences

- One call puts the same fields on logs and traces. They flow through `await`, and end with the request or job, so nothing leaks between requests.
- Logs and traces of separate traces for one match can be found together by `matchId` in Loki and Tempo.
- The context is our own API, though built on documented primitives (pino's `mixin` and the OTel Context API). It needs its own tests in `service-runtime`.
- Annotating is a rule handlers have to follow, not something the runtime works out from request bodies. The [observability pattern](../patterns/observability.md) sets it out.
- Without the OTel SDK (in tests, for instance) the context API still has to work for logs, so `annotate` must not depend on a span being recorded.
- Fields don't cross to other services. Each service annotates what it knows, and the trace links them.

## Alternatives considered

- **Explicit child loggers (`log.child({ matchId })`) passed down by hand:** simple and visible, but every function needs a logger argument, and anything that logs without one loses the fields.
- **OTel Baggage:** would carry the fields to other services for free, but goes on every outbound call, players included, so the gateway would have to strip it. Following work across services is already the trace's job.
- **LogTape's implicit contexts:** the same idea built in, but it would mean replacing pino, and it puts nothing on spans.
- **Pulling IDs out of every validated request body automatically:** needs a naming convention for body fields, and hides what is being recorded.
