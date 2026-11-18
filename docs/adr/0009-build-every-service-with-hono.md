---
type: adr
status: accepted
date: 2026-11-17
summary: Every service in the repository uses Hono, with dependencies wired by hand in a composition root and no DI container, for strong type inference, a typed frontend client and no decorators to fight the toolchain.
tags: [tech-stack, backend]
---

# Build every service with Hono, wired by hand

## Context

Every service in the repository is TypeScript on Node (see [Write the repository in TypeScript on Node](./0007-write-the-repository-in-typescript-on-node.md)): the tournament runner and player gateway, which are long-running services with database pools and background workers, and the core games and agents, some of which are tiny HTTP handlers. Using one framework for all of them keeps one set of conventions.

The forces:

- **Type safety at every layer.** Request validation, handler inputs and response bodies should all be checked by the compiler, without a second schema system next to zod (see [Use zod as the only schema library](./0010-use-zod-as-the-only-schema-library.md)).
- **A typed frontend client.** The web frontend calls only the tournament runner, and it would be good to get end-to-end types without a code-generation step.
- **Freedom in build tooling.** Many modern TypeScript build and test tools (esbuild, SWC, Oxc and others) transform one file at a time without type information, so they don't understand `emitDecoratorMetadata`, or only approximate it. A framework that depends on it would narrow the choice of tooling, which is not decided yet.
- **Portability.** Code built on the Web-standard `fetch` handler (`(req: Request) => Promise<Response>`) runs on Node, Bun, Deno and serverless platforms alike. Whether to publish SDKs for game and player authors is not decided, but this would make them easy to offer on any runtime.

The previous scaffolding used NestJS.

## Decision

We will use Hono as the HTTP framework for every service in the repository: the tournament runner, the player gateway, the core games and the core agents.

Each service wires its dependencies by hand in a single composition root, using constructor injection, with no dependency-injection container.

## Consequences

- Validators feed typed values into handlers, response bodies are checked per status code, and context variables are typed per app instance rather than through global module augmentation.
- The frontend can use Hono's RPC client with the tournament runner's API type and no code generation.
- Plain TypeScript with no decorators or type-dependent emit, so any build or test tool that strips types will work without workarounds.
- The service lifecycle is ours to write: startup ordering and graceful shutdown of the database pool and background-job workers.
- Route types for the RPC client are only inferred when routes are chained and sub-apps are mounted with `app.route()`; handlers defined apart from their routes lose inference unless created through Hono's factory helpers. Conventions for this are needed early, but are not part of this decision.
- Hono enforces no structure. How services are layered, and the exact shape of the composition root, are conventions to settle when the first service is built.
- Wiring by hand means the dependency graph is ordinary code: the compiler checks it, and there is no container metadata to break. Large services get a longer composition root.
- Very large route trees can slow the type checker ("type instantiation is excessively deep"). This is unlikely with one small app per service.

## Alternatives considered

- **NestJS** (the previous scaffolding): enforced modules and DI, lifecycle hooks and OpenAPI support. Rejected because it relies on legacy `experimentalDecorators` and `emitDecoratorMetadata`, which single-file transpilers only approximate; injection by interface needs tokens the compiler never checks; `import type` and circular imports silently break its DI metadata; class-validator DTOs are not tied to their TypeScript types and would be a second validation system; and it is heavy for small agents.
- **Fastify:** mature, the fastest of the three on Node, with strong lifecycle and plugin encapsulation. Rejected because it is Node-only, decorations need global module augmentation (so types claim decorations exist where they don't), and the type provider doesn't flow into plugins defined in separate files. It would be the choice if raw Node performance and plugin maturity mattered more than portability and the RPC client.
- **A DI container** (NestJS-style, tsyringe, inversify): needs decorators or tokens, bringing back the metadata problems above, for wiring that is short enough to write by hand.
