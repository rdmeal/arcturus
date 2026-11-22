---
type: adr
status: accepted
date: 2026-11-17
summary: Games may serve their own replay page, which the web frontend embeds from a separate origin, with the player gateway's decision log as the fallback and finished matches only, so the platform never assumes games have turns and game code can't read the user's session.
tags: [architecture, frontend, security]
---

# Show replays from the game's own page on a separate origin

## Context

Users want to look back at a match: what happened, and why their player won or lost. How a match is best shown depends entirely on the game. A card game, a board game and rock-paper-scissors need nothing in common, and the platform deliberately knows nothing about a game's structure, not even whether it has turns (see [Give game services ownership of their match state](./0002-give-game-services-ownership-of-match-state.md)).

Showing a game's own visuals inside the web frontend means running code written by a game author, possibly from another repository, next to the user's logged-in session.

Games also hold hidden information. Showing a match while it is being played could reveal an opponent's hand to a user whose player is in that match.

## Decision

We will show replays like this:

- **A game may provide a replay page.** The web frontend embeds it in a sandboxed iframe served from a **separate origin** from the main app, so the game's code cannot read the user's cookies or storage. The game owns everything about how its matches are drawn.
- **If a game has no replay page,** the web frontend falls back to the player gateway's decision log for the match: each player's decision requests and responses.
- **Only finished matches can be viewed.** Replays look back at a match and are never live. Game services must not serve a replay for a match that is still being played.

## Consequences

- Games have complete freedom over how a match is shown, and the platform never needs a concept of turns.
- Every game gets a replay view, even without a page of its own, through the decision-log fallback.
- Code from game authors is isolated from the user's session by the browser's same-origin rules.
- The installation needs a second origin for game pages, and the reverse proxy must expose only game replay pages and their assets, never game service APIs.
- Replays don't share one look or one set of controls. Each game builds its own, and a small messaging protocol between the page and the frontend (sizing, theme) is needed.
- If a game service is upgraded or removed, its old replay pages may break; the decision log still covers those matches.
- Enforcing "finished matches only" is the game service's job, because only it knows when a match has ended.
- The details are left to a later frontend and replay discussion: how a game declares its replay page, the messages between page and frontend, theming, access to replays, and the proxy rules.

## Alternatives considered

- **The frontend draws each turn, using data from the game:** consistent timeline controls owned by the platform, but it forces every game to have turns, and to make sense drawn turn by turn.
- **Web components or a micro-frontend loaded into the main app:** the best visual integration, but third-party code would run in the main app's origin, where it could read the user's session. It also brings clashes between frameworks and versions.
- **Per-turn SVG or images:** simple, safe and possible from any language, but static and still assumes turns.
- **A declarative rendering vocabulary** (games describe each state with platform primitives such as grids, cards and tokens): no third-party code, but designing the vocabulary is a large project, it limits what games can show, and every new visual need means a platform change.
- **Text logs from the game:** already covered by the player gateway's decision log.
