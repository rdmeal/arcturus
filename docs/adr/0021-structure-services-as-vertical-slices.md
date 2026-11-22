---
type: adr
status: accepted
date: 2026-11-21
summary: Each service is organised as vertical slices (one folder per command, query or job, grouped by capability), behind a CQRS-style API of POST commands and GET queries at /<area>/<slice>, with no repository layer or mediator, so each feature's code sits in one place and an endpoint's location is never in doubt.
tags: [backend]
---

# Structure services as vertical slices with a task-based API

## Context

Every service in the repository is built with Hono, wired by hand in a composition root (see [Build every service with Hono, wired by hand](./0009-build-every-service-with-hono.md)). Hono enforces no structure, and that ADR left the layering of services as a convention to settle before the first service is built. The previous NestJS scaffolding followed a loosely defined "Clean Architecture".

The services are SQL-first: they write plain SQL through Slonik (see [Access PostgreSQL with Slonik](./0011-access-postgresql-with-slonik.md)), and their database will not be swapped. They do three kinds of work: commands that change state, queries that read it, and background jobs (see [Run background jobs with graphile-worker](./0012-run-background-jobs-with-graphile-worker.md)). A solo maintainer, and coding agents, should be able to find all the code for one feature in one place, and to know without debate where new code goes.

Resource-style APIs (`PUT`/`PATCH` on entities, or `POST /tournaments/{id}/start`) tie every endpoint to one entity. That leaves it unclear where an endpoint belongs when a feature spans several entities.

## Decision

We will structure every service as vertical slices:

- A slice is one command, query or job, end to end, in its own folder `src/<area>/<slice>/`. It holds the route (or task), the request and response DTO schemas, the handler, and its SQL.
- Areas are named after capabilities (what the user or system does, such as `tournament-setup`), not after entities or tables.
- Each slice owns its SQL. A query, DTO or pure domain function moves to the area's shared module only when a second slice needs exactly the same thing. There is no repository layer.
- Routes and job tasks call their slice's handler directly, with no mediator or command bus.

The API is CQRS-style:

- Commands are `POST`s with a JSON body, and queries are `GET`s with query-string parameters. There is no `PUT` or `PATCH`.
- Every path is `/<area>/<slice>`, mirroring the folder, with IDs in the body or query string, never in the path.
- Commands and queries read and write the same tables (logical CQRS). There is no separate read store.
- A command returns only an acknowledgement: a new ID, `202 Accepted` or `204 No Content`. Reads go through queries.

This applies to each service's own API. The paths of the published game and player protocols are decided with the protocols, starting from this convention.

## Consequences

- Everything a feature needs is in one folder, and where a new endpoint or job goes follows mechanically from its capability and name.
- Similar SQL may be duplicated between slices. We accept this as cheaper than a shared repository that grows a method for every slice's variation.
- Slice-owned DTOs, mapped explicitly from rows, keep table changes from silently changing an API.
- The API reads as a list of tasks rather than entities, which is less familiar to anyone expecting REST, and paths carry no IDs.
- Commands returning only an acknowledgement suits TanStack Query, which refetches queries after a mutation, at the cost of an extra request for a client that wants the new state.
- A query that becomes slow can get its own read table as a local decision, without changing the approach.
- Pure domain rules live in plain functions without I/O, which are easy to test.
- How slices, routes, transactions and errors are written in detail is set out in patterns, not here.

## Alternatives considered

- **Full Clean or hexagonal architecture** (entities, use cases, ports and adapters, an interface per repository): ceremony with no payoff for SQL-first services whose database won't be swapped.
- **Route handlers that write SQL directly:** the least code, but logic and transactions end up scattered through HTTP code.
- **A repository per aggregate, shared by all slices:** familiar, but it pulls slices back towards a shared layer.
- **Resource paths with a verb** (`POST /tournaments/{id}/start`): an entity-based API in disguise, with the same "which resource owns this?" problem.
- **Full CQRS with projections or event sourcing:** a lot of machinery, and reads that lag behind writes, for a hobby-scale load.
- **A MediatR-style mediator:** indirection that hides which handler runs and weakens Hono's inferred types.
