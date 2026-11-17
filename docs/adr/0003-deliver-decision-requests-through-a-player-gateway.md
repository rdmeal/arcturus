---
type: adr
status: accepted
date: 2026-11-17
summary: A separate player gateway service is the only part of Arcturus that contacts players, so game services never see player endpoints and only one service needs internet access to user-supplied URLs.
tags: [architecture, player-protocol, security]
---

# Deliver decision requests through a separate player gateway

## Context

Game services own their matches (see [Give game services ownership of their match state](./0002-give-game-services-ownership-of-match-state.md)), so they decide when a player must make a choice. In the original design they called players directly.

Players are registered by users at runtime as arbitrary URLs. Calling them safely takes real work: looking up the player's endpoint, guarding against server-side request forgery (blocking private and link-local addresses, re-checked after DNS resolution), timeouts, retries with backoff, response size limits, discarding duplicate responses and logging every exchange. Players may be LLMs that answer slowly or wrongly, or people who answer hours later.

If every game service called players itself, every game, in every language, would have to do all of this correctly. Game services would also learn every player's endpoint.

## Decision

We will deliver every decision request through a player gateway: a separate platform service, and the only part of Arcturus that contacts players.

- A game service sends the player gateway a decision request for a player in a match. It never knows the player's endpoint.
- The gateway looks up the endpoint from the tournament runner, which owns the player registry, delivers the request, and calls the game service back with the action.
- The gateway handles delivery: retries, timeouts, the general shape of responses, and discarding duplicates. It reports a player that never answers to the tournament runner.
- The game service still judges the action itself: whether it is legal in the game and in the current state.
- The gateway logs every request and response, which serves as the fallback view of a finished match.

The gateway is its own service, not a module of the tournament runner.

## Consequences

- Game authors don't implement delivery, retries, timeouts or request-forgery protection; they talk to one trusted endpoint.
- Player endpoints never leave the platform, so a game service cannot contact or leak arbitrary players.
- Timeouts, retries and logging behave the same in every game, which makes "why did my player lose?" answerable everywhere.
- Only the player gateway needs to reach the internet and user-supplied URLs, so the other services can be kept off it. The gateway can also be scaled and rate-limited on its own.
- Game services can be given access to the player gateway without access to the tournament runner's API.
- There is one more service to deploy and operate, and every decision takes an extra hop. The gateway and the tournament runner need calls between them for endpoint lookups and timeout reports.
- The details are left to the player-protocol discussion: the shape of a decision request, how players reply now or later, retries, error budgets and how the gateway checks that a game service is allowed to address a player.

## Alternatives considered

- **Game services call players directly**: every game, in every language, would re-implement endpoint lookup, authentication, timeouts, retries and request-forgery protection, and every game service would know every player's endpoint.
- **The gateway as a module inside the tournament runner,** which already owns the player registry: one service fewer and no calls between them. Rejected because it would put outbound calls to untrusted URLs inside the service that holds the platform's data and its public API, and it would give game services access to the tournament runner to reach players. Since Arcturus is already a set of services, one more costs little.
