---
type: adr
status: accepted
date: 2026-11-17
summary: zod validates every boundary in TypeScript code (HTTP, callbacks, background-job payloads, database rows), so each boundary has one schema that gives both the runtime check and the static type.
tags: [tech-stack, backend]
---

# Use zod as the only schema library

## Context

TypeScript types don't exist at runtime (see [Write the repository in TypeScript on Node](./0007-write-the-repository-in-typescript-on-node.md)). Every place where data enters a service needs a runtime check: HTTP requests and responses, callbacks from other services, background-job payloads read back from the database, and database rows. If the runtime check and the static type are defined separately, they drift; the previous NestJS scaffolding had exactly that problem, with class-validator DTOs that the compiler doesn't tie to their declared types.

The other libraries chosen for the stack all integrate with zod: Hono's validators and OpenAPI generation, Slonik's row validation, and Mantine's forms.

## Decision

We will use zod (v4, as of November 2026) as the only runtime schema and validation library in TypeScript code. Static types at boundaries are inferred from zod schemas rather than written separately.

## Consequences

- Each boundary has one definition, which gives both the validator and the type.
- The same schema can be reused across layers, for example by the tournament runner's API and the frontend's forms.
- Every boundary is validated the same way, including job payloads and database rows, which are easy to forget.
- Bundle size in the frontend is larger than with the smallest alternatives.
- Where the protocol schemas originate (written as zod and exported, or written as a language-neutral contract and turned into zod) is a separate decision, for the protocols.

## Alternatives considered

- **Valibot:** smaller bundles, but not enough of a gain to justify a second system or weaker integration.
- **ArkType:** faster validation, but the same objection, and validation speed is not a bottleneck at this scale.
- **class-validator:** what NestJS uses; decorators that the compiler doesn't tie to the declared types, and it doesn't fit a decorator-free stack (see [Build every service with Hono, wired by hand](./0009-build-every-service-with-hono.md)).
