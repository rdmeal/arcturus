---
type: adr
status: accepted
date: 2026-11-18
summary: Every service, game, agent service, library and tool is its own package with its own package.json, managed by pnpm, so a package can only import what it declares, which mirrors how outside authors consume shared code and replaces Nx's lint-rule boundaries.
tags: [tooling, monorepo]
---

# Organise the repository as pnpm package-based workspaces

## Context

The repository holds the platform's services, the web frontend, core games, core agents, the libraries they share, and tooling for the repository itself. Outside authors add games and players from their own repositories and can only reuse shared code by declaring it as a dependency (see [Extend Arcturus only through published protocols](./0004-extend-arcturus-through-published-protocols.md)). Core games and agents are meant to go through the same experience.

The old stack used an Nx integrated layout: a single root `package.json`, with module boundaries enforced by an Nx ESLint rule. That rule goes when Nx and ESLint go (see [Build, test, lint and format with Vite+](./0017-build-test-lint-and-format-with-vite-plus.md)), so something else has to stop one package from quietly importing another's internals or an undeclared dependency.

The old stack used Yarn 4. With its `node-modules` linker, a package can resolve dependencies it never declared. Plug'n'Play is strict, but it causes friction with tools that expect a `node_modules` folder.

## Decision

We will use pnpm workspaces, with a `package.json` for every service, game service, agent service, library and tool. Each package declares everything it imports.

The folders are:

```
apps/web                     # the web frontend
services/tournament-runner
services/player-gateway
packages/<name>              # shared libraries that services and games import
games/<game>/service         # the game service
games/<game>/agents          # one service hosting all of the game's core agents
tools/<name>                 # repo tooling: CI helpers, repo checks, generators
```

## Consequences

- pnpm's strict `node_modules` means a package can only resolve what it declares, so boundaries are enforced structurally rather than by lint rules.
- In-repo games and agents consume shared code the way an outside author would, through declared dependencies.
- Undeclared imports fail straight away, which may be noisy while packages are first being set up.
- `packages/` means exactly "libraries that services and games import". Tooling the platform doesn't use lives in `tools/`, so a service can't come to depend on a CI script. Short shell snippets used by a single workflow can stay inline in that workflow.
- All of a game's core agents share one service, because they are small HTTP handlers. One deployable per agent would multiply projects, containers and CI time for no benefit.
- Library names are chosen when each library is created. The protocol packages, any SDKs and a shared service runtime are not pre-named here, because those decisions are still open.
- If Vite+ disappoints, Nx can be added on top of this layout with `nx init`. Moving away from an integrated layout would have been the harder direction.

## Alternatives considered

- **Nx integrated layout (a single root `package.json`):** hides dependency boundaries, and isn't how outside authors consume shared code.
- **Yarn 4 with the `node-modules` linker:** doesn't enforce declared dependencies.
- **Yarn 4 with Plug'n'Play:** strict, but causes friction with tools that expect `node_modules`.
- **Everything flat under `packages/`:** simpler, but loses the visible split between the platform, games, libraries and tooling.
- **Tooling in `packages/` or `.github/scripts/`:** the first blurs what a package is; the second ties tooling to GitHub and can't hold workspace packages.
