---
type: adr
status: accepted
date: 2026-11-18
summary: Services and workspace libraries run from their .ts source using Node's type stripping, ESM only, which removes a build per service at the cost of limiting code to erasable TypeScript.
tags: [tooling, backend]
---

# Run TypeScript source directly, with no build step

## Context

Services are written in TypeScript and run on Node (see [Write the repository in TypeScript on Node](./0007-write-the-repository-in-typescript-on-node.md)). Node 26 strips TypeScript types natively, but only for erasable syntax: no enums, namespaces or constructor parameter properties. It does not strip types in files under `node_modules`.

The earlier plan was to bundle each service with tsdown. That means a build step and source maps for every service. Bundling also gets in the way of OpenTelemetry auto-instrumentation, which patches modules such as `pg` as they load, so those modules would have to stay outside the bundle.

Vite and Vitest already load TypeScript source directly, so the frontend build and the tests don't need compiled libraries.

## Decision

We will run services from their TypeScript source with Node's type stripping (`node src/main.ts`), with no build step. Workspace libraries point their `package.json` `exports` at their TypeScript source and have no build of their own.

Every package is ESM only (`"type": "module"`).

A shared base tsconfig, extended by every package, holds the compiler settings that make this work. Examples are strict mode, erasable syntax only, `.ts` import extensions and no emit. Nothing compiles to JavaScript, so there are no project references. The web frontend adds its DOM and JSX settings on top.

## Consequences

- No build step, no build output and no source maps for services. A service's image ships its source and production dependencies.
- OpenTelemetry auto-instrumentation can patch modules normally, because nothing is bundled.
- Code is limited to erasable TypeScript: no enums, namespaces or constructor parameter properties. Imports use `.ts` extensions.
- Workspace libraries are pnpm symlinks, which Node resolves to their real paths outside `node_modules`, so their types should be stripped. **The walking skeleton must confirm this.**
- Under ESM, OpenTelemetry auto-instrumentation must be loaded with Node's `--import` flag, before application code.
- Type errors aren't caught at run time, only by the type checks in `vp check` (see [Build, test, lint and format with Vite+](./0017-build-test-lint-and-format-with-vite-plus.md)).
- A library published to npm will need a build (`vp pack`) when that happens. Publishing is not yet decided.
- Node 26's `require(esm)` covers any CommonJS consumer, so no CommonJS output is needed.

## Alternatives considered

- **Bundle each service with tsdown (`vp pack`):** adds a build and source maps for every service, and dependencies such as `pg` have to stay outside the bundle for OpenTelemetry.
- **Compile with `tsc` to JavaScript:** a build step and project references for no gain over type stripping.
