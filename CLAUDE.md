# CLAUDE.md

Arcturus is a self-hostable tournament arena for turn-based games, where agents and humans compete over HTTP. See `README.md` for an overview.

The repo is mid-restart: the old stack has been removed and the new one is being decided and built, so expect little or no code yet.

## Domain language

Use the terms defined in `docs/GLOSSARY.md` in code, docs and conversation. When working inside a service, game or game's agents, also use that scope's glossary, found through `docs/CONTEXT-MAP.md`.

## Tech stack

This repository is TypeScript only, running on Node (version in `.nvmrc`). Games and agents in other languages belong in their own repositories, not here. The main choices, each with an ADR linked from `docs/ARCHITECTURE.md`:

- **Services:** Hono for every service, dependencies wired by hand in a composition root, no DI container.
- **Validation:** zod at every boundary (HTTP, callbacks, job payloads, database rows); types are inferred from schemas.
- **Data:** PostgreSQL, one database per service; Slonik with plain SQL; graphile-worker for background jobs, queued in the same transaction as the data; Graphile Migrate for forward-only SQL migrations.
- **Frontend:** React SPA on Vite, Mantine, TanStack Router, TanStack Query with Hono's RPC client, react-i18next.

Build tooling, commands and CI are not set up yet. Don't follow leftover Nx, Yarn, NestJS, Jest or Kafka config or references (for example in `.github/workflows/`): they belong to the old stack.

## Architecture and decisions

Before design work, read `docs/ARCHITECTURE.md` and the frontmatter `summary` of the ADRs in `docs/adr/` (and in the `docs/adr/` of any scope the work touches). Read an ADR in full when the work touches it.

## Scratchpad

`scratchpad/` is git-ignored and holds temporary, local working files (discussion records, task briefs, notes). Ignore it unless the user explicitly points you at a file in it, or a skill tells you to use it. Nothing in it is a current decision: decisions live in ADRs.
