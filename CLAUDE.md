# CLAUDE.md

Arcturus is a self-hostable tournament arena for turn-based games, where agents and humans compete over HTTP. See `README.md` for an overview.

The repo is mid-restart: the old stack has been removed and the new one is being decided and built, so expect little or no code yet.

## Domain language

Use the terms defined in `docs/GLOSSARY.md` in code, docs and conversation. When working inside a service, game or game's agents, also use that scope's glossary, found through `docs/CONTEXT-MAP.md`.

## Architecture and decisions

Before design work, read `docs/ARCHITECTURE.md` and the frontmatter `summary` of the ADRs in `docs/adr/` (and in the `docs/adr/` of any scope the work touches). Read an ADR in full when the work touches it.

## Scratchpad

`scratchpad/` is git-ignored and holds temporary, local working files (discussion records, task briefs, notes). Ignore it unless the user explicitly points you at a file in it, or a skill tells you to use it. Nothing in it is a current decision: decisions live in ADRs.
