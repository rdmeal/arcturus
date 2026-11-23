---
type: pattern
summary: Use when testing a service's behaviour — write an in-process API test in the slice folder with the shared fixtures, arrange through the API, assert through responses and recorded requests, and use direct database access only through the guarded escape hatch.
tags: [backend, testing]
---

# Service API tests

A service's behaviour is tested through its own API, in-process, against the real app, a real database and faked neighbouring services. Unit tests are kept for pure domain logic. Tests built this way survive refactoring inside a slice and show only what each test depends on.

## When to use it

- Testing any command, query or job of a service: a platform service, a game service or an agent service.
- Testing what a service sends to other services, and how it handles their answers.

## When not to

- For pure domain functions, such as a game's rules (`applyAction`, `legalActions`, `visibleStateFor`), and for shared utilities in `packages/`. Unit-test them directly, with data from [service test data factories](./service-test-data.md). Rule 14 says how game rules and game service API tests divide the work.
- For `service-runtime`'s server start-up, shutdown and health checks, which in-process tests skip. They have their own tests in that package.

## Rules

### Where tests live

1. An API test sits in its slice's folder, as `src/<area>/<slice>/<slice>.test.ts`. A unit test sits next to the function it tests, as `<file>.test.ts`.
2. Test-only code lives only in `*.test.ts` files, in `src/test/`, in `*.handlers.ts` files (see [Service endpoint mocks](./service-endpoint-mock.md)), or in `packages/service-testing`. A service's factories go in `src/test/factories/`, and its arrange helpers in `src/test/arrange.ts`. The shared harness, with the fixtures, the test database and the MSW server set-up, is `packages/service-testing`, a dev dependency of every service.
3. Production code never imports test-only code, `@arcturus/service-testing`, `msw`, `fishery` or `@testcontainers/*`. A lint rule enforces this, and test libraries are only ever `devDependencies`.

### Fixtures, not hooks

4. Tests use the `test` exported by `packages/service-testing`, built with Vitest's `test.extend`. Its fixtures are:
   - `db`: a fresh, empty database for this test, cloned from the service's migrated template and dropped afterwards;
   - `client`: the app from `createApp(deps)`, wrapped in Hono's `testClient`;
   - `network`: the MSW server, reset after the test;
   - `runJobs`: runs the service's queued jobs (rule 11);
   - `clock`: fixed at `2030-01-01T00:00:00Z` by default, far enough from real time that any accidental use of the system clock shows. It has `now()`, `set(instant)` and `advance(milliseconds)`, and works with `Date` until the choice between `Date` and `Temporal` is made;
   - `captureLogs`: the log records written during the test, for the rare test that asserts a log line (rule 19).

   Ask only for the fixtures the test uses. They are set up lazily.

5. The `client` fixture builds config with the service's `parseConfig` and test values, never from env files or `process.env`. A test that needs a different setting passes it as a fixture option, so the setting shows in the test.
6. Never use `beforeAll`, `beforeEach`, `afterEach` or `afterAll` in a test file. Lint forbids them. Write a test's data and handler overrides in its body. Setup shared by several tests is a plain function each test calls.
7. Use `testClient` for requests, and `client`'s underlying `app.request()` only for requests the typed client can't make, such as a malformed body.

### Arranging

8. Every test starts from an empty schema: the migrations, with only the lookup rows the schema needs. There is no seed data. A test arranges everything it relies on.
9. Arrange state through the service's own API, with helpers in `src/test/arrange.ts`, such as `createTournament(client, overrides)`, that send factory-built request bodies. A state that depends on another service is reached the way production reaches it: through this service's inbound endpoint, with MSW standing in for the other side.

### Asserting

10. Assert only through what the service exposes: the response, its problem details, a query's result, and requests recorded by an MSW override. Never query a table to check a result.
11. API tests don't start a job worker. After a command that queues a job, call `runJobs()`, which runs queued jobs until none can run, and then assert. Never poll or sleep. Test a job slice by queuing its job and calling `runJobs()`. If a job throws anything other than a `DomainError`, `runJobs()` fails the test, so a broken job can't sit unnoticed in the queue. Only a test about retries opts out, with `runJobs({ allowFailures: true })`, and then asserts the retry through the API.
12. Use explicit matchers: `toEqual`, or `toMatchObject` when only some fields matter. Never use snapshots.

### The direct database escape hatch

13. When a state can't reasonably be reached through the API, or an effect can't be seen through it, use a helper in the service's `src/test/direct-db.ts`. That module holds every direct insert and read the service's tests use, such as `insertMatchState`, and is the only code that takes a connection from the `db` fixture. Lint forbids importing it. Each import carries a disable comment whose reason says why the API route doesn't work. Reaching for this because it's shorter is not a reason.

### Game services

14. A game's rules get thorough unit tests on its pure rule functions, with states built by factories, and they cover every awkward state. A game service's API tests cover the protocol flow: starting a match, decision requests going out, actions coming in, invalid actions and results. They insert a mid-match state directly (rule 13) only when a flow needs one.

### Structure

15. Each API test file has one `describe`, named after its endpoint (for example `POST /tournament-setup/create-tournament`). A unit test file has one `describe` per function. Don't nest `describe` blocks.
16. Name each test after the behaviour a client sees ("rejects a tournament with fewer than two entrants"), not the implementation ("calls insertTournament").
17. Test files run in parallel. Tests within a file run in order: don't use `test.concurrent`, because the MSW server is shared within a worker.

### Logs

18. `packages/service-testing` sends the service's logs, pretty-printed, through `console`, so Vitest links each line to its test and shows logs only for failing tests. Never change the logger's destination or level in a test.
19. Assert a log line, with `captureLogs`, only when the log line is the behaviour being tested, such as a domain error in a job being logged as a warning. Otherwise assert through the API (rule 10).
20. Service tests run without the OpenTelemetry SDK, so spans are never recorded. Don't assert on traces. Trace propagation is tested only in `service-runtime`'s own tests.

## Exemplar

None yet: established by the first ticket that uses it.

## Related

- [Test services mostly through their API, in-process](../adr/0032-test-services-through-their-api.md)
- [Give every test a fresh database from a migrated template](../adr/0035-give-every-test-a-fresh-database-from-a-template.md)
- [Run test databases in Testcontainers](../adr/0034-run-test-databases-in-testcontainers.md)
- [Service endpoint mocks](./service-endpoint-mock.md)
- [Service test data factories](./service-test-data.md)
- [Vertical slices](./vertical-slice.md): the folders tests sit in.
- [Service composition root](./service-composition-root.md): `createApp(deps)`, `parseConfig` and the clock.
- [Background jobs](./background-job.md)
- [Observability](./observability.md): how services log.
