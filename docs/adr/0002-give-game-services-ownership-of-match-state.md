---
type: adr
status: accepted
date: 2026-11-17
summary: Each game service holds the real state of its matches, sends each player only what it may see, and validates actions, because this handles hidden information and simultaneous and multi-step turns in any language.
tags: [architecture, game-protocol]
---

# Give game services ownership of their match state

## Context

Arcturus runs board and card games. They are turn-based, but a turn may be simultaneous (rock-paper-scissors) or take several steps (choose a pile to draw from, see the drawn card, then play a card). Many have hidden information: a player may know there are seven cards left in the deck, but not which ones.

Someone has to hold the real state of a match, decide what each player is allowed to see, and check that what a player returns is legal. Games may be written in any language and come from other repositories, and the platform should know nothing about how a game is structured: not even whether it has turns.

## Decision

We will make each game service the owner of its matches. A game service:

- holds the real state of every match it runs;
- sends each player only the state that player may see, plus the history of the match redacted in the same way, so players can be stateless;
- validates every action against the rules and the current state;
- decides when the match is over and reports its result to the tournament runner.

The platform knows about matches, not about anything inside them: rounds, turns and hands belong to the game.

## Consequences

- Hidden information, simultaneous decisions and multi-step turns are handled inside the game, so the platform needs no special cases for them.
- Game authors have full freedom in how they model and store a game, in any language.
- Every game implements its own match loop, deadlines, resolution of simultaneous decisions and redaction of history. An SDK published for the language the platform and core games are written in can take most of that away for authors using that language; authors in other languages start from the game protocol.
- A buggy or malicious game service could report a wrong result. This is acceptable because game services are trusted and deployed by the operator (see [Co-host game services with the platform and register players at runtime](./0005-co-host-game-services-and-register-players-at-runtime.md)).
- Game services are stateful and have their own storage, so each one is a little heavier to run than a set of pure functions would be.

## Alternatives considered

- **The game as a rules engine:** the platform runs the match loop and calls the game's pure functions (initial state, what each player may see, applying actions, whether the match is over, scores), possibly as WebAssembly modules. Plugins would be smaller and the platform would handle timeouts, logging and replays consistently. Rejected: match state moves out of the game, every action costs a call, and WebAssembly limits which languages are practical. Its main benefit, reducing trust in games from other repositories, matters little for a hobby project, and the player gateway provides the rest (see [Deliver decision requests through a separate player gateway](./0003-deliver-decision-requests-through-a-player-gateway.md)).
- **Games as packages loaded into a generic game host:** excellent developer experience, with rules tested as plain functions and no network hop. Rejected: it ties games to one language, which conflicts with letting authors use any stack, and a buggy game could crash or block the host.
