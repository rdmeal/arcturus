---
type: glossary
---

# Arcturus

The language shared across the whole of Arcturus: the platform, the protocols between services, and what every game and player has in common. Each scope listed in [CONTEXT-MAP.md](./CONTEXT-MAP.md) may add its own terms in its own glossary.

## Language

### Arcturus and its parts

**Arcturus**:
The whole project: the platform, the core games and agents, and the protocols that let others add their own.

**Platform**:
The game-independent part of Arcturus: the tournament runner, the player gateway and the web frontend.
_Avoid_: core (for the platform)

**Tournament runner**:
The platform service that owns users, tournaments and the player registry, starts matches on game services, and is the only API the web frontend calls.

**Player gateway**:
The platform service that delivers decision requests to players and returns their actions to game services. It is the only part of Arcturus that contacts players.
_Avoid_: agent gateway

**Game service**:
The service that implements one game: it holds the state of each match, sends decision requests, and validates actions.
_Avoid_: game runner

**Core game** / **Core agent**:
A game service or agent maintained in the Arcturus repository and shipped with it. Being core says where the code comes from, not how it behaves: the platform treats core and other games and players identically. Not to be confused with **House agent**: an operator may make a core agent a house agent, but needn't.

**Game protocol**:
The published HTTP contract between a game service and the platform: how matches are started, how decision requests are sent through the player gateway, and how results are reported. Any service that implements it is a game service, whichever repository it comes from.

**Player protocol**:
The published HTTP contract between the player gateway and players: how decision requests are delivered and actions returned. Anything that implements it can be registered as a player.

### Play

**Game**:
A set of rules that Arcturus can run tournaments of, such as rock-paper-scissors or poker. One play-through of a game is a match, not a game.
_Avoid_: game type, ruleset

**Match**:
One play-through of a game between players, always part of a tournament. The lowest level the platform knows about: everything inside a match (rounds, turns, hands) belongs to the game.

**Tournament**:
A competition in one game, run as a series of matches between players, that produces a ranking. A quick one-off test is a tournament with a single match.

**Decision log**:
The player gateway's stored record of every decision request it sent and every response it received, shown to users as the fallback view of a finished match. It is domain data, not to be confused with a service's logs.
_Avoid_: gateway logs

### Players

**Player**:
A decision-maker registered with Arcturus to take part in matches, reached at its own endpoint. Either an agent or a human player. A player is an endpoint, not a service: one service can host many players.

**Agent**:
A player whose decisions are made by software, from fixed rules to LLMs. Not to be confused with the coding agents used to build Arcturus.
_Avoid_: bot

**Human player**:
A player whose decisions are made by a person, through a UI that relays each decision request to them.
_Avoid_: human client

**House agent**:
An agent the operator makes available to every user, configured with the installation rather than registered by a user. Wherever its code comes from, it is a player like any other in matches.
_Avoid_: built-in player, default agent

### People

**User**:
A role: a person with an account, who owns tournaments and players. The person behind a human player need not be a user.

**Operator**:
A role: whoever deploys and configures an Arcturus installation. On a self-hosted installation the operator is often also its only user.

**Contributor**:
A role: anyone who changes the Arcturus repository, the maintainer included. Not to be confused with **Author**, who works in their own repository.
_Avoid_: developer (ambiguous between contributor and author)

**Author**:
A role: someone who writes a game service or a player in their own repository, against the game protocol or player protocol. Say **game author** or **player author** when it matters which.
_Avoid_: plugin developer, third-party developer
