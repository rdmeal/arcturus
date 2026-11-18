---
type: adr
status: accepted
date: 2026-11-18
summary: Vite+ (vp) is the single toolchain and task runner, wrapping Vite, Vitest, Oxlint, Oxfmt and type-aware checks, so a solo maintainer keeps one tool current instead of Nx and its plugins.
tags: [tooling, monorepo]
---

# Build, test, lint and format with Vite+

## Context

The old stack used Nx 20 to orchestrate webpack, Jest, ESLint and Prettier. These tools are slower than their newer equivalents, need more configuration, and each Nx plugin adds its own upgrades. The project has one maintainer and is expected to hold around 15–20 packages.

The web frontend is built with Vite (see [Build the frontend as a React single-page app](./0014-build-the-frontend-as-a-react-spa.md)).

Vite+ is VoidZero's unified toolchain. Its `vp` CLI covers dev, build, pack, test (Vitest), lint (Oxlint), format (Oxfmt) and `check`. `vp run` runs package scripts across the workspace in dependency order, with local caching. Vite+ 1.0 was released under the MIT licence in September 2026, and 1.4 was out by late October 2026. Remote caching is still on its roadmap.

Nx's distinctive features are worth little at this size:

- **`affected` and remote caching:** local caching is enough for ~15–20 packages.
- **Generators:** help only inside this repository, not outside authors.
- **Module boundaries:** now enforced by pnpm workspaces (see [Organise the repository as pnpm package-based workspaces](./0016-organise-the-repository-as-pnpm-workspaces.md)).

Oxc-based tools don't type-check: they strip types file by file.

## Decision

We will use Vite+ as the single toolchain and task runner, with no Nx:

- **Vitest** for tests;
- **Oxlint** for linting;
- **Oxfmt** for formatting;
- **Vite** for the frontend build;
- **`vp check`** for format, lint and type checks in one command, with type-aware linting and type checking turned on.

The repository pins its Vite+ version, so every machine and CI run the same toolchain.

## Consequences

- One CLI and one tool to upgrade, with no Nx plugin versions to keep in step.
- The bundled tools are faster and share one configuration style.
- Vite+ pins the versions of the tools it bundles, so an upstream fix in Vite, Vitest or Oxc may take a while to reach us.
- Vite+ is young. We accept the risk of breaking changes and gaps, such as remote caching not existing yet.
- Type checking uses tsgolint, which is built on the native Go port of TypeScript. It is not a full `tsc --noEmit`, so some diagnostics could slip through. If a real gap shows up, we add a `tsc --noEmit` task.
- Oxlint has fewer rules and plugins than ESLint, and its support for custom JavaScript rules is newer.
- If Vite+ disappoints, Nx can be added on top of the package-based workspaces later.

## Alternatives considered

- **Nx with the standalone tools (`@nx/vite`, `@nx/vitest`, an Oxlint integration):** keeps `affected`, generators and the boundary rule, but adds moving parts and plugin upgrades for a solo maintainer. It was the first recommendation, made before the plugin requirements were known.
- **Nx and Vite+ together:** two task runners and two caches that overlap, for little gain.
- **Keep webpack, Jest, ESLint and Prettier:** slower, more configuration, and four tools to keep current.
- **`tsc --noEmit` per package instead of `vp check`'s type checking:** more exhaustive, but slower, and a second TypeScript toolchain to maintain.
