---
type: adr
status: accepted
date: 2026-11-17
summary: Game services are trusted, deployed beside the platform on a private network and registered through the operator's config; players are untrusted and registered by users at runtime, which keeps the platform simple at the cost of a redeploy for each new game.
tags: [architecture, security]
---

# Co-host game services with the platform and register players at runtime

## Context

Games and players both come from outside the platform, but they play very different roles. A game service holds match state, sees every player's identifier and reports results, so a dishonest one could fabricate a winner. A player only answers the decision requests it is sent.

The people who add them are different too. Players are what users bring, often for a hackathon, so registering one has to be quick and self-service. New games are rarer, and are added by whoever runs the installation.

Arcturus is a hobby project. Security matters, and easy ways to cheat should be closed off, but it does not need to be enterprise-grade.

## Decision

We will treat game services and players differently:

- **Game services are trusted.** The operator deploys them alongside the platform, on the same private network, and lists them in the operator config. Adding or removing a game means changing that config and redeploying.
- **Players are untrusted and external.** Users register them at runtime by endpoint URL. Only the player gateway contacts them (see [Deliver decision requests through a separate player gateway](./0003-deliver-decision-requests-through-a-player-gateway.md)). House agents are entries the operator config adds to the same registry, not a separate path.

## Consequences

- Calls between the platform and game services stay on a private network, so authentication between them can be simple. Some gaps are accepted because of this. For example, anything that can reach a game service could start a match on it, and the callbacks from the player gateway are protected only by network isolation. A later service-to-service auth discussion records these gaps and how far to close them.
- Failures and logs from games are all in one deployment, which is easier to operate.
- Adding a game needs a redeploy, which is acceptable for an operator but means users cannot bring their own games.
- Game service APIs must never be exposed publicly. Only what browsers need (replay pages and their assets) is published.
- Because the game protocol is plain HTTP, runtime registration of games hosted elsewhere can be added later as a second source for the same game registry, without a redesign.

## Alternatives considered

- **Runtime registration of games hosted by third parties:** no redeploy to add a game, and third parties pay for hosting. Rejected for now: third-party game services would see players' identifiers and could fabricate results, and the platform would need public authentication in both directions, a registry with health checks, protocol versioning and an approval workflow. An outage elsewhere could also leave tournaments stuck. It stays possible later, as described above.
