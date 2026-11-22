---
type: adr
status: accepted
date: 2026-11-22
summary: The player gateway sends traceparent to players but ignores trace context in anything they send, while platform and game services propagate it both ways, because players are untrusted and could otherwise attach spans to or join Arcturus's traces.
tags: [architecture, player-protocol, security, observability]
---

# Ignore trace context from players

## Context

Trace context crosses HTTP calls in the W3C `traceparent` and `tracestate` headers. OTel's HTTP instrumentation reads them from every incoming request by default, and continues the trace they name.

Game services are trusted and run beside the platform on a private network. Players are untrusted endpoints registered by users at runtime (see [Co-host game services and register players at runtime](./0005-co-host-game-services-and-register-players-at-runtime.md)), and the player gateway is the only part of Arcturus that contacts them (see [Deliver decision requests through a player gateway](./0003-deliver-decision-requests-through-a-player-gateway.md)).

A player that could set `traceparent` on what it sends the gateway would choose the parent of the gateway's spans. It could attach spans to traces it shouldn't touch, tie unrelated traces together, or influence the sampling decision. A trace ID sent _to_ a player reveals nothing.

Authors can use OpenTelemetry in every major language, so a game or player that wants to join Arcturus's traces can.

## Decision

We will treat trace context by trust:

- **Gateway → player:** the gateway sends `traceparent`. A player may use it or ignore it.
- **Player → gateway:** the gateway ignores trace context in anything a player sends. Its player-facing routes turn off the HTTP instrumentation's extraction.
- **Between platform services and game services:** trace context is propagated in both directions.
- **For the protocols:** the game protocol will recommend, but not require, that games propagate `traceparent`. The player protocol will say that players may read it.

## Consequences

- No player can affect Arcturus's traces or sampling.
- A player that uses OTel can trace its own work under the gateway's trace ID, in its own backend.
- The player-facing routes need their extraction turned off explicitly, and a new player-facing route has to do the same.
- The protocol sessions write this position into the game and player protocols.

## Alternatives considered

- **Trusting trace context from players:** simpler, with no exception in the gateway, but it gives untrusted endpoints a say over our traces.
- **Not sending `traceparent` to players:** safe, but it denies player authors a trace ID to correlate with, for no protection gained.
