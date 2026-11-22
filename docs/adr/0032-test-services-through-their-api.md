---
type: adr
status: accepted
date: 2026-11-22
summary: Each service's behaviour is tested mostly by in-process API tests against the real app, a real database and MSW-faked neighbours, with unit tests only for pure domain logic such as game rules and shared utilities, following the testing trophy.
tags: [testing, backend]
---

# Test services mostly through their API, in-process

## Context

Every service is a Hono app built by `createApp(deps)` from dependencies wired by hand (see [Build every service with Hono, wired by hand](./0009-build-every-service-with-hono.md)), and is organised as vertical slices whose handlers own their SQL and transactions, with no repository layer (see [Structure services as vertical slices with a task-based API](./0021-structure-services-as-vertical-slices.md) and [Open database transactions explicitly in handlers](./0022-open-database-transactions-explicitly-in-handlers.md)). Pure domain rules, such as a game's rules, live in plain functions without I/O.

Kent C. Dodds's [testing trophy](https://kentcdodds.com/blog/the-testing-trophy-and-testing-classifications) puts most of the effort into integration tests that mock as little as possible, because "the more your tests resemble the way your software is used, the more confidence they can give you". The article says it was thought through for monoliths, not services. It applies here one service at a time: what a service's clients use is its API.

Hono documents testing an app in-process: `app.request()` sends a request straight to the app's `fetch` handler, and `testClient` from `hono/testing` wraps the app in a client typed from `AppType`, as the frontend's RPC client is.

A slice's handler, SQL and transaction are one unit. Unit-testing a handler would mean mocking its queries, which tests how the slice is written rather than what it does, and breaks whenever the SQL changes.

## Decision

We will test each service's behaviour mostly through its API:

- API tests build the real app with `createApp(deps)` and send requests in-process with `testClient`, using `app.request()` for raw cases such as malformed bodies. They don't start a server.
- The dependencies are real except a test database for each test, a fixed clock, and outbound HTTP, which is faked at the network level (see [Fake outbound HTTP in tests with MSW](./0033-fake-outbound-http-in-tests-with-msw.md)).
- Tests reach the state they need through the API and check results through what the service exposes. Going to the database directly is a guarded exception, set out in the patterns.
- Unit tests cover only pure domain functions and shared utilities in `packages/`. Game rules are tested this way, thoroughly, so a game service's API tests only need to cover the protocol flow.

## Consequences

- Tests survive refactoring inside a slice: changing the SQL, splitting a handler or moving a query doesn't break them.
- Each API test touches a real database, so the suite needs Postgres and a way of isolating tests (see [Run test databases in Testcontainers](./0034-run-test-databases-in-testcontainers.md) and [Give every test a fresh database from a migrated template](./0035-give-every-test-a-fresh-database-from-a-template.md)). API tests are slower than unit tests, which running files in parallel and sharding in CI offset.
- Testing in-process skips the real server start-up in `main.ts` and `service-runtime`, so `service-runtime`'s lifecycle and health checks need tests of their own.
- An awkward game state is tested through the rule functions, without playing most of a match through the API.
- Arranging state through the API means a test for a deep state makes several calls. Helpers keep this short, and inserting rows directly stays possible for states the API can't reach cheaply.

## Alternatives considered

- **Starting the real server on a port and calling it with `fetch`:** closer to production, but slower, needs port handling, and runs the same Hono `fetch` handler anyway.
- **Unit-testing handlers with their queries mocked:** fast, but tests implementation details and needs mocks of our own code, which the trophy warns against.
