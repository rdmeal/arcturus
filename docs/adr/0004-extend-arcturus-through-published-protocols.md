---
type: adr
status: accepted
date: 2026-11-17
summary: Games and players connect only through the published, language-neutral game protocol and player protocol, which core games and agents also use exclusively, so authors can work in any language and the repo goes through the same experience as outside authors.
tags: [architecture, game-protocol, player-protocol]
---

# Extend Arcturus only through published protocols

## Context

Anyone should be able to add a game or a player from their own repository, in any language. Games and agents in other languages, built as a way of learning other stacks, will live in their own repositories rather than in this one. The users are tech enthusiasts writing players for hackathons and learning projects, so the barrier to entry has to be low.

Since every service talks over HTTP (see [Build Arcturus as independent services connected by HTTP](./0001-build-arcturus-as-services-connected-by-http.md)), the question is what defines the extension point: a library to depend on, or a contract to implement.

There is also a risk specific to this repository: games that live next to the platform can easily start depending on its internals, and then nobody notices when something an outside author needs is missing or awkward.

## Decision

We will make two published, language-neutral HTTP contracts the only ways to extend Arcturus:

- the **game protocol**, between a game service and the platform;
- the **player protocol**, between the player gateway and players.

The contracts are defined first, in a language-neutral form, and code in every language follows them. Any service that implements the game protocol is a game service, and anything that implements the player protocol can be registered as a player, whichever repository it comes from.

Core games and agents use only the published protocols, never platform internals. Any SDKs, if published, are a convenience, never a requirement.

## Consequences

- An author in any language can build a game or a player from the published contract alone.
- Core games and agents go through what an outside author goes through, so gaps and rough edges in the protocols show up early.
- The protocols are a public contract. Changing them needs versioning and care, even while the only consumers are in this repository.
- The protocols must be documented well enough to implement without reading platform code.
- Follow-on decisions: the specification format and schema tooling, how protocols are versioned, whether to publish SDKs, and the language of the repository (see [Write the repository in TypeScript on Node](./0007-write-the-repository-in-typescript-on-node.md)).

## Alternatives considered

- **A package in the platform's language as the interface:** convenient for authors in that language, but it rules out every other language, which conflicts with letting games and players be built in any stack.
- **Calling games and players "plugins":** dropped as a term because it suggests code loaded into a host process, the model rejected in [Give game services ownership of their match state](./0002-give-game-services-ownership-of-match-state.md). Extensibility is described as implementing a protocol instead.
