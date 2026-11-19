---
type: adr
status: accepted
date: 2026-11-17
summary: Split Arcturus into independently deployable services (platform, one per game, agents) that own their own data and talk only over HTTP with JSON, with no message broker, so games and players can be written in any language and run by a solo maintainer.
tags: [architecture, integration, data-ownership]
---

# Build Arcturus as independent services connected by HTTP

## Context

Arcturus runs tournaments of turn-based games between players, who may be agents or human players. Several forces shape how it is put together:

- **Games and players in any language.** Adding new games and players from other repositories is a central goal, and each game or agent is also a chance to learn a different tech stack. Whatever connects the parts has to be easy to implement in any language.
- **A solo maintainer, as a hobby.** Outside contributions aren't expected. Infrastructure that needs running, upgrading or understanding has a real cost.
- **Small load.** A 50-player round robin is 1,225 matches, with a few tournaments running at once. Games are turn-based and never real time, so everything can be asynchronous, and a single decision may take minutes (retries, slow agents) or hours (human players).
- **Reliability matters more than throughput.** A lost message can leave a tournament stuck.

The repository previously held two scaffolded services that used Kafka for messaging, with no domain logic. The project is restarting, so the shape can be chosen afresh.

## Decision

We will build Arcturus as a set of independently deployable services that talk to each other only over HTTP with JSON.

**Components:**

- **The platform:** the tournament runner, the player gateway and the web frontend.
- **One game service per game**, holding the state of its matches (see [Give game services ownership of their match state](./0002-give-game-services-ownership-of-match-state.md)).
- **Players**, reached only through the player gateway (see [Deliver decision requests through a separate player gateway](./0003-deliver-decision-requests-through-a-player-gateway.md)). A player is an agent or a human player; the platform treats both the same.

**Integration:**

- Work that may take a while is accepted with `202 Accepted` and completed later by an HTTP callback.
- Each service makes its own work durable (retries and queues within the service). There is no shared message broker.
- Callbacks are delivered at least once, so every receiver must be idempotent.

**Data ownership:** each service owns its data, and no service reads another's database.

- The tournament runner owns users, tournaments, the player registry (including house agents), match results and standings. There is no separate user service.
- A game service owns its match state.
- The player gateway owns the log of decision requests and responses. The web frontend reaches it only through the tournament runner, which checks ownership.

**The tournament runner is the only API the web frontend calls**, apart from game replay pages (see [Show replays from the game's own page on a separate origin](./0006-show-replays-from-game-pages-on-a-separate-origin.md)) and the player gateway's endpoint for submitting an action later.

**Every match belongs to a tournament.** A quick one-off test is a tournament with a single match, so the tournament runner has one way of starting matches and one place for ownership checks.

**Interactions:**

1. Browser → tournament runner: everything the web frontend does.
2. Tournament runner → game service: fetch the game's self-description (its manifest) at startup.
3. Tournament runner → game service: start a match with its players.
4. Game service → player gateway: send a decision request. Player gateway → player: deliver it. Player gateway → game service: call back with the action.
5. Player → player gateway: submit an action later, for human players and slow agents.
6. Player gateway → tournament runner: look up a player's endpoint; report that a player timed out.
7. Game service → tournament runner: report the match result, or that a player used up its error budget.
8. Browser → game service: replay pages only, from a separate origin.

When a player fails (times out or uses up its error budget), it is reported to the tournament runner, which decides what happens to the match.

## Consequences

- Any language that can serve and call HTTP can implement a game or a player. Nobody needs a broker client or credentials for a cluster.
- There is no broker to run. Durable work lives inside each service, using infrastructure the service already has.
- Delivery semantics are our own code: retries, timeouts, backoff and recovering lost callbacks. Every receiver has to be written to be idempotent.
- There is no fan-out. A new consumer of events (analytics, notifications) means changing the sender. If outside parties ever need to follow tournament events, webhook subscriptions come first, and a broker only if that outgrows HTTP.
- There is no event log to replay. If an audit trail or event replay is wanted, tournament and match events are stored in a table by the service that owns them.
- The system is distributed from the start, so adding another service costs little, but debugging needs tracing across services.
- The tournament runner holds most of the platform's data and its whole public API. If it grows too large, the natural split is a "platform API" (users, tournaments, players, results) and a "tournament scheduler" (dispatching matches). Nothing needs splitting now.
- The choice of language, framework, database and in-service job queue is left to later ADRs. This ADR does not fix whether services share a database server, only that none reads another's data.
- The policy for player failures (forfeit, draw, cancelling the match) is still to be decided.

## Alternatives considered

- **Kafka** (the previous design): heavy to run for a solo maintainer at this scale, and every game and player author would need a Kafka client and cluster credentials. Its main Node client, kafkajs, also appeared to have been unmaintained since early 2023 (as of November 2026).
- **NATS JetStream:** a light, single-binary broker and a reasonable choice if one is ever needed, but authors would still need a NATS client.
- **A database-backed queue as the interface between services:** impossible for services in other repositories without exposing the database. It is still a good fit for durable work inside a service.
- **Redis Streams:** more infrastructure without a clear gain over the above.
- **A separate user service**: with an external identity provider it would hold one small table, at the cost of a network hop, another database and consistency problems between services, and ownership checks need tournament data anyway. It would become worth having if Arcturus stored credentials itself, grew user features such as teams, roles or personal API keys, or had several services needing user profiles.
- **Standalone matches outside tournaments:** would need a second way of starting matches and ownership checks on bare matches, for a case a single-match tournament already covers.
