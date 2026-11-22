---
type: adr
status: accepted
date: 2026-11-22
summary: addJob carries trace context in a reserved payload key so jobs continue the trace, except where a new unit of work starts (a match start, a decision request), which opens a new trace linked to its cause, so a decision is traced end to end without a match becoming one unusable trace.
tags: [backend, observability]
---

# Trace each decision through jobs as its own trace

## Context

Trace context crosses HTTP calls automatically, through the W3C `traceparent` header. It doesn't cross background jobs: a job runs later, in a worker, outside the request that queued it. Every outbound call caused by a write runs in a job (see [Run background jobs with graphile-worker](./0012-run-background-jobs-with-graphile-worker.md)), so without help, a decision's journey (game service → player gateway → player → action back to the game service) breaks into a separate trace at every step.

graphile-worker jobs have no headers or metadata field, only a JSON `payload`. graphile-worker has no OTel instrumentation; it only emits events.

If every job simply continued the trace that queued it, a whole match would be one trace: each action's callback queues the next decision request. A whole tournament would be one trace too, because starting a tournament queues the start of every match. That trace would last hours and hold thousands of spans. Tracing backends can store it, but nobody can read it.

OTel's span links record a causal relationship between spans in different traces.

## Decision

We will carry trace context through jobs, and start a new trace for each new unit of work:

- **`service-runtime`'s `addJob` writes the active `traceparent` and `tracestate` into a reserved `_trace` payload key.** Its `defineTask` strips the key before validating the payload, then runs the handler in a `CONSUMER` span named `process <task name>`, continuing the trace, with the job ID and attempt number as attributes. Each retry is its own span in the same trace.
- **`addJob(…, { newTrace: true })` starts a new root span instead, with a span link to the current span.** The tournament runner uses it when it queues each match's start, and a game service uses it when it queues each decision request.
- **So a trace is one match start, or one decision end to end.** The context fields (`matchId`, `tournamentId`) tie a match's traces together (see [Share one observability context between logs and spans](./0042-share-one-observability-context-between-logs-and-spans.md)).

## Consequences

- One trace shows a decision end to end, including retries and the player's response time, which is the question tracing is here to answer.
- A match is a set of traces, found by `matchId`, and linked one to the next.
- Slice code never sees `_trace`. No payload schema may define it, and it counts towards the payload's size.
- Choosing where `newTrace` goes is a judgement for each new flow. The [background-job pattern](../patterns/background-job.md) gives the rule.
- Game services outside this repository propagate trace context or not, as they choose. The gateway continues whatever `traceparent` it receives.

## Alternatives considered

- **Keeping trace context in a side table keyed by job ID:** an extra write and something to clean up, for no gain over the payload.
- **One trace per match or tournament:** the simplest, but the trace view becomes unusable.
- **Every job starting its own trace, joined only by links:** loses the end-to-end view of a decision.
