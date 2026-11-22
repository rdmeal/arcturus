# CLAUDE.md

Arcturus is a self-hostable tournament arena for turn-based games, where agents and humans compete over HTTP. See `README.md` for an overview.

The repo is mid-restart: the old stack has been removed and the new one is being decided and built, so expect little or no code yet.

This repository is TypeScript only. Games and agents in other languages belong in their own repositories, not here.

## Where things are documented

Read each when the trigger applies, not up front:

- `docs/GLOSSARY.md`: the terms to use in code, docs and conversation, always. Inside a service, game or game's agents, also that scope's glossary, found through `docs/CONTEXT-MAP.md`.
- `docs/ARCHITECTURE.md`: the components, how they interact and the technology choices. Read it before design work.
- `docs/adr/` (and a scope's `docs/adr/`): one ADR per decision. Before design work, read the frontmatter `summary` of each (`grep -H '^summary:' docs/adr/*.md`), and read an ADR in full when the work touches it.
- `docs/patterns/` (and a scope's `docs/patterns/`): how each kind of code is written. Before writing a kind of code, grep the `summary` lines (`grep -H '^summary:' docs/patterns/*.md`) and follow every pattern that applies.
- `docs/develop/`: contributor guides. Read `docs/develop/pull-requests.md` before committing for a pull request or writing one; PR titles are Conventional Commits.
- `.claude/rules/`: guidance for particular kinds of file, loaded automatically when you touch a matching file.

Every fact has one home: when something documented changes, update its home rather than adding a copy, here or anywhere else. Load the `writing-docs` skill before writing or editing any doc.

## Commands

@docs/develop/commands.md

A project hook formats every file you write or edit, so there's no need to run `vp fmt` after an edit.

## Scratchpad

`scratchpad/` is git-ignored and holds temporary, local working files (discussion records, task briefs, notes). Ignore it unless the user explicitly points you at a file in it, or a skill tells you to use it. Nothing in it is a current decision: decisions live in ADRs.
