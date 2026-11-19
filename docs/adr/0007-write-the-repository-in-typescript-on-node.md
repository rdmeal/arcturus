---
type: adr
status: accepted
date: 2026-11-17
summary: Everything in this repository (the platform, core games and core agents) is written in TypeScript and runs on Node, so a solo maintainer works with one language and toolchain across frontend and backend; games and agents in other languages live in their own repositories.
tags: [tech-stack]
---

# Write the repository in TypeScript on Node

## Context

The architecture ADRs deliberately name no language: services talk only over HTTP (see [Build Arcturus as independent services connected by HTTP](./0001-build-arcturus-as-services-connected-by-http.md)), and games and players connect through language-neutral protocols (see [Extend Arcturus only through published protocols](./0004-extend-arcturus-through-published-protocols.md)). The platform's language therefore matters less than it would in a monolith, but it still has to be chosen, for the tournament runner, the player gateway, the web frontend, and the core games and agents.

The forces:

- **A solo maintainer.** Every extra language means another toolchain, linter, test runner, CI setup and set of dependencies to keep current.
- **A browser frontend.** The web frontend will be TypeScript whatever the backend is written in, so a TypeScript backend means one language end to end and types shared between the two.
- **The audience.** Players are mostly written by tech enthusiasts at hackathons and in learning projects. TypeScript and JavaScript are what most of them already know.
- **A learning goal.** Building games and agents in a range of stacks was originally meant to happen inside this repository.

The previous scaffolding was TypeScript on Node (NestJS), and `.nvmrc` pins Node 26.13.1 (as of November 2026).

## Decision

We will write everything in this repository in TypeScript: the tournament runner, the player gateway, the web frontend, and every core game and core agent. Services run on Node, at the version pinned in `.nvmrc`.

Games and agents in other languages, built to learn other stacks, live in their own repositories and connect through the published protocols, like any outside author's.

## Consequences

- One language, one toolchain and one set of conventions across the whole repository.
- The frontend and backend can share types; the frontend can use a typed client for the tournament runner's API without code generation.
- The learning goal moves out of this repository. Other-language games and agents get no special treatment: they use the protocols exactly as an outside author would, which keeps the protocols honest.
- Types don't exist at runtime, so every boundary (HTTP, callbacks, background jobs, database rows) needs explicit runtime validation.
- Libraries are chosen for Node. Code meant to run elsewhere (for example any future SDK for players) can still be kept runtime-portable by building on Web-standard APIs.
- Node can run TypeScript directly by stripping types, but only for erasable syntax (no enums, decorators or constructor parameter properties). Services do run without a build step (see [Run TypeScript source directly, with no build step](./0018-run-typescript-source-directly.md)), so this limit applies.

## Alternatives considered

- **Go**, especially for the player gateway, which is an outbound HTTP relay and a natural fit: rejected as a second language and toolchain for one maintainer, with no frontend sharing.
- **Kotlin or C#:** stronger runtime type systems, but no sharing with the frontend and heavier services for what are mostly small HTTP handlers.
- **Core games in a range of stacks inside this repository:** the original learning goal, but it would put several toolchains into one repository and its CI. Other-language games in their own repositories meet the same goal.
- **Bun or Deno as the runtime:** faster startup and built-in TypeScript, but the libraries chosen for database access, background jobs and observability are Node-first, and Node's own type stripping narrows the gap.
