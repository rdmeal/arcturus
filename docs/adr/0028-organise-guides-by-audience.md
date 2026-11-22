---
type: adr
status: accepted
date: 2026-11-22
summary: Task guides live in audience folders (develop, operate, extend, use), mirrored inside each scope's docs, while the glossary, architecture, ADRs and patterns stay shared at docs/ root, because the audiences' tasks barely overlap and a type-based split would scatter each audience's material.
tags: [docs]
---

# Organise guides by audience, with shared reference

## Context

Arcturus's docs have four human audiences, named by roles in the glossary: **contributors**, who change this repository; **operators**, who deploy and configure an installation; **authors**, who write game services and players in their own repositories against the protocols; and **users**. Claude reads what contributors read.

Their tasks barely overlap. An operator configuring house agents and an author implementing the player protocol need different guides. The overlaps that do exist are reference material: the glossary, the architecture, and the protocol definitions, which both contributors and authors need.

Each scope in `docs/CONTEXT-MAP.md` (a service, a game, a game's agents) already has its own `docs/` folder for its glossary, ADRs and patterns, and the placement rules for those depend on `docs/adr/` and `docs/patterns/` sitting directly under a scope's `docs/`.

Until now the README carried everything in one page: the pitch, a contributor's getting-started, the pull request rule and Claude Code setup.

## Decision

We will organise task-oriented guides by audience, in these folders:

- `docs/develop/` for contributors;
- `docs/operate/` for operators;
- `docs/extend/` for authors;
- `docs/use/` for users.

Shared reference stays at the root of `docs/` and is linked from every audience: `GLOSSARY.md`, `CONTEXT-MAP.md`, `ARCHITECTURE.md`, `adr/`, `patterns/` and `skills/`.

A scope uses the same layout inside its own `docs/`. For example, a core game's rules and action format for player authors go in `games/<game>/docs/extend/`. The root audience folders hold Arcturus-wide material and link down to scope docs. Every package also has a short `README.md` saying what it is and how to run and test it, with a link to its scope's docs.

The README becomes the front door: the pitch, the status, a table sending each audience to its folder, and the licence. A folder is created when its first doc is written. Guides carry `type: guide` frontmatter, and the README and audience landing pages `type: index`; package READMEs have no frontmatter. The docs are plain Markdown rendered by GitHub, with no docs site for now.

## Consequences

- Each audience finds its material in one folder, and the README stays short.
- Material that two audiences need must live in shared reference or one audience's folder, with a link from the other, following [Give every documented fact one home](./0027-give-every-documented-fact-one-home.md).
- A scope's guides sit beside its own glossary and ADRs, so a game's docs move with the game.
- Within a folder a guide may lean towards one kind of writing (a tutorial, a how-to, reference), but there are no folders for those kinds.
- Whether to publish the docs as a site is left until protocol packages are published and authors become a real audience. Keeping relative links, one H1 per file and `type` frontmatter now keeps that option open; VitePress and Starlight are the likely candidates.
- There is no root `CONTRIBUTING.md`, because outside contributions aren't expected; contributor material starts from `docs/develop/`.

## Alternatives considered

- **Split by kind of document (Diátaxis: tutorials, how-to guides, reference, explanation), with an index page per audience:** the best-known documentation framework, but it spreads each audience's material across four folders and needs the indexes kept in sync, too much for one maintainer when the audiences hardly share tasks.
- **Everything in the README:** what the repository did before; it grows without bound and buries each audience's starting point.
