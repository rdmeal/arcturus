---
type: pattern
summary: Use when adding a command, query or endpoint to a service — write it as a slice in src/<area>/<slice>/ with its own route, DTO schemas, handler and SQL.
tags: [backend]
---

# Vertical slices

A slice is one command or query, end to end, in its own folder: its route, its request and response schemas, its handler and its SQL. Everything a feature needs is in one place, and where new code goes follows mechanically from what it does.

## When to use it

Whenever a service gets a new command (something that changes state) or query (something that reads it), whatever the service: the tournament runner, the player gateway, a game service or an agent service with logic worth separating from its route.

## When not to

- Background work done after a commit is a job slice. It has the same folder shape, but its own rules in [Background jobs](./background-job.md).
- `/health/live` and `/health/ready` come from `service-runtime`, not from slices (see [Service composition root](./service-composition-root.md)).
- A trivial agent that maps a decision request to an action may keep its logic inline in the route. Use a handler as soon as there is logic worth testing on its own.

## Rules

1. A slice lives in `src/<area>/<slice>/`. The area is a capability, named after what the user or system does (`tournament-setup`, `match-play`), never after an entity or table (`tournaments`, `matches`). A slice that touches several tables goes in the area of the capability it serves.
2. Slice names are kebab-case verb-noun phrases: commands are imperative (`start-tournament`, `register-player`), queries start with `get-` or `list-` (`get-standings`).
3. A slice folder has a file per role: `route.ts`, `schemas.ts`, `handler.ts` and `queries.ts`. Leave out a file the slice doesn't need.
4. Exports are named after the slice in camelCase: the route factory is `<slice>Route` (`startTournamentRoute`), the handler is `<slice>` (`startTournament`), and the schemas are `<slice>Input` and `<slice>Output`.
5. The path of every endpoint is `/<area>/<slice>`, matching its folder. Paths never contain IDs.
6. Commands are `POST` with a JSON body, which carries any IDs. Queries are `GET` with query-string parameters. A query uses `POST` only when its input genuinely can't fit in a query string. There is no `PUT`, `PATCH` or generic update endpoint.
7. A command returns only an acknowledgement: `201` with the new ID, `202` for accepted asynchronous work, or `204`. It never returns the updated resource; clients read it through a query.
8. `route.ts` exports `<slice>Route(deps)`, which returns a new Hono app with a single route: the path, `validateRequest` from `@arcturus/service-runtime` for `json` or `query` (see [Error handling](./error-handling.md) rule 7), and an inline handler. The inline handler calls the slice's handler, parses the result with `<slice>Output`, and returns it with `c.json` and an explicit status, named as a constant in the file (`const created = 201;`) because lint forbids bare numbers. Parsing on the way out strips any field the schema doesn't list.
9. Each area has `src/<area>/router.ts`, which chains every slice in the area with `.route('/', <slice>Route(deps))`. `createApp` chains the areas with `.route('/<area>', …)`. Every call is chained, never written as separate statements, or the RPC client loses the route types.
10. A function that returns a Hono app, such as `<slice>Route` or an area's router, leaves its return type inferred, because a Hono app's type is its routes and the RPC client reads them from it. It carries a disable comment for `typescript/explicit-module-boundary-types` with that reason, as [Linting](../develop/linting.md#the-rule-set) describes. Every other exported function, the handler included, declares its return type.
11. `schemas.ts` holds the slice's zod schemas for its request and response DTOs. DTOs are never database rows or row schemas, and never built by spreading a row: the handler maps each field explicitly.
12. The handler is a function `<slice>(deps, input)`. It is the only function in the slice that receives `deps`, and it declares only the dependencies it uses, with `Pick` on the service's `Deps` type. It never sees Hono's context.
13. `queries.ts` holds the slice's SQL as functions taking a connection (typed `CommonQueryMethods`, so they work inside a transaction or a read) and their parameters, each validating rows with a zod row schema through Slonik's `sql.type`. A statement that returns no rows uses `sql.typeAlias("void")`, and a `Date` is bound with `sql.timestamp(date)`. `sql` and the connection types come from `@arcturus/service-runtime`, never from Slonik directly. Each query aliases every column it returns to camelCase (`created_at AS "createdAt"`), so row schemas have camelCase keys. Never use a Slonik field-name interceptor. Column naming is in [Database migrations](./database-migration.md). Each slice owns its SQL, even when another slice has something similar.
14. Code moves to `src/<area>/shared/` only when a second slice needs exactly the same thing: a query, a DTO schema for the same concept, or a pure domain function. Domain functions have no I/O and take plain values, including the current time already read from the clock.
15. New IDs are random v4 UUIDs generated in the handler with `crypto.randomUUID()`, never by a database default, so the ID is known before the insert.
16. Routes and job tasks call their handler directly. There is no mediator, command bus or handler registry.
17. Commands and queries read and write the same tables. A query may use joins or views shaped for its DTO. A dedicated read table is a local decision for one slow query, not the default.

## Exemplar

`services/example/src/messaging/`: `send-message` is a command (`sendMessageRoute` answering `201` with the new ID, `sendMessage`, `insertMessage`) and `get-message` a query (`getMessageRoute` validating its query string, `getMessage` mapping the row to the DTO, `selectMessage` aliasing `created_at`). `router.ts`, `messagingRouter`, chains both, and `services/example/src/app.ts` mounts it at `/messaging`.

## Related

- [Structure services as vertical slices with a task-based API](../adr/0021-structure-services-as-vertical-slices.md)
- [Background jobs](./background-job.md): job slices follow the same folder shape.
- [Database transactions](./database-transaction.md): how handlers use the database.
- [Error handling](./error-handling.md): how handlers signal expected failures.
- [Service composition root](./service-composition-root.md): where `deps` and `createApp` come from.
