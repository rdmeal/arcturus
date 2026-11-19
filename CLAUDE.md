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
- **Repository:** pnpm workspaces, a `package.json` per package: `apps/web`, `services/*`, `packages/*` (shared libraries), `games/<game>/{service,agents}`, `tools/*` (repo tooling, never imported by services or games).
- **Tooling:** Vite+ (`vp`) as the one toolchain and task runner, with Vitest, Oxlint and Oxfmt.
- **Running code:** services and libraries run from `.ts` source with Node's type stripping, with no build step, ESM only. Write erasable TypeScript only (no enums, namespaces or constructor parameter properties), and import with `.ts` extensions.
- **CI:** a pull-request workflow and a main workflow, both calling a reusable quality-check workflow.

## Commands

Run these from the repository root:

- `vp install`: install dependencies, with the pnpm version pinned in `package.json`.
- `vp check`: format check, lint and type check, all in one. Lint warnings fail it too.
- `vp fmt`: fix formatting. Markdown, JSON and YAML are formatted as well as code, so run it after editing docs.
- `vp test`: run every test. `vp test <path>` runs one test file.
- `vp run -r build`: build every package that has a `build` script.

`pnpm run check`, `pnpm run test` and `pnpm run build` do the same as `vp check`, `vp test` and `vp run -r build`.

## Architecture and decisions

Before design work, read `docs/ARCHITECTURE.md` and the frontmatter `summary` of the ADRs in `docs/adr/` (and in the `docs/adr/` of any scope the work touches). Read an ADR in full when the work touches it.

## Scratchpad

`scratchpad/` is git-ignored and holds temporary, local working files (discussion records, task briefs, notes). Ignore it unless the user explicitly points you at a file in it, or a skill tells you to use it. Nothing in it is a current decision: decisions live in ADRs.
