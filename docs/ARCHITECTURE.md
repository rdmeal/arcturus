# Architecture

The running parts of Arcturus, what each owns, and how they talk to each other. This page describes the current picture and is kept up to date. The reasons behind it are in the ADRs in [`adr/`](./adr/), and the terms are defined in [GLOSSARY.md](./GLOSSARY.md). The technologies used are in [Tech stack](./develop/tech-stack.md), and where the code lives in [Codebase](./develop/codebase.md).

## Components

```mermaid
flowchart LR
    browser([Browser])

    subgraph platform[Platform]
        web[Web frontend]
        runner[Tournament runner]
        gateway[Player gateway]
    end

    subgraph games[Game services, private network]
        game[Game service<br/>one per game]
    end

    players([Players<br/>agents and human players])

    browser --> web
    browser -- API --> runner
    browser -. replay pages,<br/>separate origin .-> game
    runner -- manifest,<br/>start match --> game
    game -- decision requests --> gateway
    gateway -- actions --> game
    game -- results,<br/>error budget used up --> runner
    gateway -- endpoint lookup,<br/>timeouts --> runner
    gateway -- decision requests --> players
    players -. act later .-> gateway
```

| Component             | Owns                                                                                 |
| --------------------- | ------------------------------------------------------------------------------------ |
| **Tournament runner** | Users, tournaments, the player registry (including house agents), results, standings |
| **Player gateway**    | The decision log: every decision request sent and response received                  |
| **Game service**      | The state of each of its matches                                                     |
| **Web frontend**      | Nothing; it calls only the tournament runner                                         |

Each service owns its data, and no service reads another's database. Players are external: users register them at runtime, and only the player gateway contacts them. Game services are deployed by the operator beside the platform, on a private network.

## Interactions

All communication is HTTP with JSON. Work that may take a while is accepted with `202 Accepted` and completed by a callback, delivered at least once, so receivers are idempotent. There is no message broker.

1. **Browser → tournament runner:** everything the web frontend does.
2. **Tournament runner → game service:** fetch the game's manifest at startup.
3. **Tournament runner → game service:** start a match with its players. Every match belongs to a tournament.
4. **Game service → player gateway → player:** a decision request, delivered by the gateway; the gateway calls the game service back with the action.
5. **Player → player gateway:** submit an action later (human players, slow agents).
6. **Player gateway → tournament runner:** look up a player's endpoint; report that a player timed out.
7. **Game service → tournament runner:** report the match result, or that a player used up its error budget.
8. **Browser → game service:** replay pages of finished matches only, from a separate origin.

When a player fails, the tournament runner decides what happens to the match. That policy is not yet decided.

## Extending Arcturus

Games and players are added by implementing the **game protocol** or the **player protocol**. Core games and agents use only these protocols, never platform internals.

## Decisions

Every decision behind this picture has an ADR in [`adr/`](./adr/), one file per decision, named after what was decided. Each ADR's frontmatter `summary` says what was decided and why.
