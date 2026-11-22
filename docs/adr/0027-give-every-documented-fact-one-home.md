---
type: adr
status: accepted
date: 2026-11-22
summary: Each fact lives in exactly one doc and every other doc links to it, or gives at most a one-line summary with the link, so a solo maintainer's docs, CLAUDE.md included, can't drift apart.
tags: [docs]
---

# Give every documented fact one home

## Context

Arcturus has one maintainer and several kinds of reader: contributors, operators, users, authors of games and players in other repositories, and Claude. Each reader wants the same facts presented from a different angle, which makes it tempting to restate a fact wherever someone might need it.

By November 2026 this had already happened. The technology choices were recorded in the ADRs, summarised again in the technology table in `docs/ARCHITECTURE.md`, and restated a third time in `CLAUDE.md`. The pull request title rule appeared in an ADR, the README and `CLAUDE.md`. `docs/ARCHITECTURE.md` kept a hand-maintained list of every ADR, which duplicated the folder. Every copy has to be found and changed when the fact changes, and with one maintainer some copies won't be. Copies in `CLAUDE.md` also cost context in every Claude session and subagent.

## Decision

We will give every documented fact exactly one home. Other docs link to that home, or give at most a one-line summary next to the link, as the technology table does for ADRs. They never restate rules, steps or reasoning.

This applies to every doc in the repository, including `CLAUDE.md`, Claude rules and skills, and package READMEs.

## Consequences

- A change to a fact is made in one place, and the docs can't contradict one another.
- Readers follow more links. A guide reads less like a self-contained page and more like a route through the docs.
- Each new doc needs a decision about which facts it owns and which it only links to.
- `CLAUDE.md` becomes a set of pointers rather than a summary of the project (see [Load Claude's project context in layers](./0029-load-claude-context-in-layers.md)).
- `docs/ARCHITECTURE.md` drops its list of ADRs and links the `adr/` folder instead. ADR file names read as titles, and their `summary` lines can be searched. A generated index for ADRs and patterns can be added later if browsing the folder proves too hard.
- Where both people and Claude must see the same text, such as the command list, the one home is a contributor doc and `CLAUDE.md` imports it rather than copying it.

## Alternatives considered

- **Audience-specific copies kept in sync by hand:** each audience gets a self-contained page, but with one maintainer the copies drift, as the restated technology choices already had.
- **A generated ADR index in `docs/adr/README.md`, checked in CI:** solves the drift of the hand-kept list, but adds tooling for little gain while the folder listing serves well enough.
