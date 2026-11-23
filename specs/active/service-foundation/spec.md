---
type: spec
status: in-progress
scopes: [arcturus]
created: 2026-11-23
---

# Service foundation

## Problem

Every service Arcturus is about to build (the tournament runner, the player gateway, game services and agent services) needs the same plumbing:

- starting and stopping cleanly, and reporting its health;
- database access through explicit transactions;
- background jobs queued with their data;
- domain errors turned into problem details;
- logs and traces;
- local infrastructure, migrations, a test harness, lint rules and CI.

The ADRs and patterns say how each of these should work, but none of it exists yet. Every pattern's exemplar still reads "None yet".

If the first real service were built without this foundation, a contributor would have to invent the plumbing in the middle of domain work, and the riskiest parts of the stack would only be tested there:

- Node's type stripping through pnpm's workspace symlinks;
- loading a TypeScript telemetry entry point with `--import`;
- graphile-worker jobs committing and rolling back with a Slonik transaction;
- OpenTelemetry's ESM instrumentation patching modules that run as `.ts` source.

A problem in any of these would mean reworking domain code that had already been written on top of it.

## Solution

A contributor gets a working foundation before any domain work starts:

- **A shared runtime library** gives every service start-up, graceful shutdown, health checks, the database wrapper, typed background jobs, domain errors mapped to problem details, an imported logger, observability context and telemetry, so a service only writes its own configuration, dependencies and slices.
- **A shared test harness** gives every service in-process API tests with a fresh database per test, faked neighbouring services, a fixed clock, explicit job runs and captured logs.
- **Local infrastructure** runs in Docker Compose: Postgres, with a role, database and shadow database per service, and the otel-lgtm container. Each service has scripts to migrate, watch a migration being written, rebuild its development database and dump its schema.
- **Guard rails** stop the mistakes the patterns warn about: lint rules, a CI check for unfinished migrations, and CI that runs its checks as parallel jobs, with sharded tests, ending in one required quality gate.
- **A temporary example service** uses all of this with a tiny message domain, which sets an exemplar for every pattern and proves the risky parts work together:
  - a command stores a message and queues a delivery job;
  - the job sends the message to a configured URL, which locally points back at the service's own idempotent inbox endpoint;
  - a query returns the message and whether it has been delivered.

  Batch B deletes it once its real slices can serve as the exemplars.

## User stories

1. As a contributor, I want a new service to get start-up, graceful shutdown and health checks from the shared runtime, so that I write no lifecycle code of my own.
2. As a contributor, I want `/health/live` to answer whenever the process is up, and `/health/ready` to check only the service's own database and worker, so that one service going down never marks the others unready.
3. As a contributor, I want a service with no database to use only the server, shutdown and health parts of the runtime, so that agent services carry nothing they don't need.
4. As a contributor, I want handlers to reach the database only by opening a transaction or a read explicitly, with lock and statement timeouts on every connection, so that what runs in a transaction is visible in the code and a self-deadlock fails with an error instead of hanging.
5. As a contributor, I want to queue a job through the transaction's connection, so that the job commits or rolls back with the data it belongs to.
6. As a contributor, I want job payloads validated when they're queued and again when they run, so that a malformed job fails at the point it was created.
7. As a contributor, I want a domain error thrown in a job to be logged as a warning and complete the job, while any other error is retried with backoff, so that jobs that can never succeed don't retry forever.
8. As a contributor, I want a domain error thrown in a handler to reach the client as problem details with its code, and an unexpected error to reach it as a 500 that reveals nothing internal, so that clients can act on expected failures and internals never leak.
9. As a contributor, I want to import one logger from the runtime that writes JSON by default and pretty output locally, at a level I can set, so that I never pass a logger around and local logs are readable.
10. As a contributor, I want one log line per request, with its method, route, status and duration, so that I can follow traffic without logging in every handler.
11. As a contributor, I want to annotate the domain IDs a handler or job acts on, and have them appear on every log line and on the active span, so that logs and traces can be searched by the same fields.
12. As a contributor, I want a request's whole trace to show in local Grafana, with its log lines linked: the incoming request, its queries, the job it queued, the outbound call the job made, and the request that call caused. That way I can see where time goes and what went wrong.
13. As a contributor, I want a job to continue its cause's trace, or to start a new trace linked to its cause where a new unit of work begins, so that a decision can be followed end to end without a whole match becoming one trace.
14. As a contributor, I want one command to start the local infrastructure and wait until Postgres is healthy, and one to stop it, so that running the stack needs no other set-up.
15. As a contributor, I want a service's `dev` script to bring its database up to date with the committed migrations before starting in watch mode, so that I never run against a stale schema.
16. As a contributor, I want to write a migration under watch, rebuild my development database from the committed migrations, and have the schema dump regenerated when migrations run, so that schema changes are quick to iterate on and visible in review.
17. As a contributor, I want an in-process API test to get its own fresh database, the app wired with test configuration, faked neighbouring services, a fixed clock, explicit job runs and captured logs as fixtures, so that each test shows only what it depends on.
18. As a contributor, I want a job that throws anything other than a domain error to fail my test, unless the test is about retries and says so, so that a broken job can't sit unnoticed in the queue.
19. As a contributor, I want the test clock fixed at an instant far from real time by default, which a test can set or advance, so that any accidental use of the system clock shows.
20. As a contributor, I want the tests to need only Docker, and to use the same pinned Postgres image as Compose, so that `vp test` needs no running infrastructure and tests and development can't drift onto different Postgres versions.
21. As a contributor, I want lint to stop production code from importing test code or test libraries, so that nothing test-only reaches a running service.
22. As a contributor, I want lint to reject test hooks and snapshots, imports of the direct-database escape hatch without a stated reason, and any disable comment without a reason, so that the testing patterns are enforced rather than remembered.
23. As a contributor, I want CI to fail when any service's `current.sql` holds more than comments, so that an unfinished migration can't reach `main`.
24. As a contributor, I want CI to run its checks as parallel jobs, with tests sharded and their reports merged, behind one quality gate that fails if any job failed, was cancelled or was skipped, so that feedback is fast and the ruleset never has to change when jobs do.
25. As a contributor, I want every pattern to name a working exemplar in a real service, so that I can copy a working example rather than work from the rules alone.
26. As a contributor, I want the contributor docs to say that tests need Docker, where to open Grafana, and that Claude runs database-backed tests outside its sandbox, so that I'm not surprised by any of them.

## Decisions

- [Store service data in PostgreSQL](../../../docs/adr/0008-store-service-data-in-postgresql.md): the example service has its own database, role and shadow database.
- [Build every service with Hono, wired by hand](../../../docs/adr/0009-build-every-service-with-hono.md)
- [Use zod as the only schema library](../../../docs/adr/0010-use-zod-as-the-only-schema-library.md): configuration, DTOs, job payloads and rows.
- [Access PostgreSQL with Slonik](../../../docs/adr/0011-access-postgresql-with-slonik.md)
- [Run background jobs with graphile-worker](../../../docs/adr/0012-run-background-jobs-with-graphile-worker.md)
- [Migrate databases with Graphile Migrate](../../../docs/adr/0013-migrate-databases-with-graphile-migrate.md): migrations run as a script step before `dev`, never on service start-up. There is no separate migration runner.
- [Organise the repository as pnpm package-based workspaces](../../../docs/adr/0016-organise-the-repository-as-pnpm-workspaces.md): the runtime and the test harness are packages. The test harness is only ever a dev dependency.
- [Build, test, lint and format with Vite+](../../../docs/adr/0017-build-test-lint-and-format-with-vite-plus.md): the lint guard rails are Oxlint rules, and test projects are set up in the root Vite+ config.
- [Run TypeScript source directly, with no build step](../../../docs/adr/0018-run-typescript-source-directly.md): the example service is the first check that type stripping works for workspace libraries through pnpm's symlinks.
- [Compose CI from reusable workflows](../../../docs/adr/0019-compose-ci-from-reusable-workflows.md) and [Gate pull requests on one quality-gate job after parallel checks](../../../docs/adr/0045-gate-pull-requests-on-one-quality-gate-job.md): the quality-check workflow becomes parallel jobs (check, sharded tests, merged test report, build, workflow lint, repo checks) ending in the gate. The maintainer switches the `main` ruleset to require the gate.
- [Guard the dependency supply chain](../../../docs/adr/0020-guard-the-dependency-supply-chain.md): every new dependency (fishery, MSW, Testcontainers, the OTel packages, pino) passes the release-age and trust checks before it's added. Compose images are pinned by digest.
- [Structure services as vertical slices with a task-based API](../../../docs/adr/0021-structure-services-as-vertical-slices.md)
- [Open database transactions explicitly in handlers](../../../docs/adr/0022-open-database-transactions-explicitly-in-handlers.md)
- [Signal expected failures with thrown domain errors](../../../docs/adr/0024-signal-expected-failures-with-thrown-domain-errors.md)
- [Run infrastructure in Compose and services on the host](../../../docs/adr/0030-run-infrastructure-in-compose-and-services-on-the-host.md): there is no reverse proxy and there are no development images.
- [Load configuration only in each service's config module](../../../docs/adr/0031-load-configuration-only-in-each-services-config-module.md): the maintainer writes each `.env.development`, and each ticket lists the keys it needs.
- [Test services mostly through their API, in-process](../../../docs/adr/0032-test-services-through-their-api.md), [Fake outbound HTTP in tests with MSW](../../../docs/adr/0033-fake-outbound-http-in-tests-with-msw.md), [Run test databases in Testcontainers](../../../docs/adr/0034-run-test-databases-in-testcontainers.md), [Give every test a fresh database from a migrated template](../../../docs/adr/0035-give-every-test-a-fresh-database-from-a-template.md) and [Build test data with fishery factories](../../../docs/adr/0036-build-test-data-with-fishery-factories.md): the test harness.
- [Use OpenTelemetry for backend traces and logs](../../../docs/adr/0038-use-opentelemetry-for-backend-telemetry.md), [Log with pino, to stdout and OTLP](../../../docs/adr/0039-log-with-pino-to-stdout-and-otlp.md), [Run grafana/otel-lgtm as the local observability backend](../../../docs/adr/0040-run-otel-lgtm-as-the-local-observability-backend.md), [Start OpenTelemetry from service-runtime with Node's --import](../../../docs/adr/0041-start-opentelemetry-from-service-runtime-with-import.md), [Share one observability context between logs and spans](../../../docs/adr/0042-share-one-observability-context-between-logs-and-spans.md) and [Trace each decision through jobs as its own trace](../../../docs/adr/0043-trace-each-decision-through-jobs-as-its-own-trace.md): the runtime's observability.
- **The first service is a temporary example service with a message domain.** It's the only way to prove the risky parts in a real package behind a workspace symlink, and to set every pattern's exemplar, without guessing at domain work that sessions 6–9 haven't designed yet. Two toy services were rejected as twice the throwaway code, since cross-service propagation is already covered by the runtime's own tests. Keeping it for good was rejected because it would have to be maintained without being product code. Batch B deletes it and moves the exemplar links to its real slices.
- **The example service takes port 3900**, listed as temporary in the local development ports table, outside the platform, game and agent ranges.
- **`LOG_LEVEL` and `LOG_FORMAT` are optional, defaulting to `info` and `json`**, because a log level isn't a setting a deployment can harmfully forget (see the service composition root pattern).
- **`runJobs()` fails the test on a job that throws anything other than a domain error**, with an opt-in for retry tests, because a failed job left silently in the queue hides bugs.
- **The test clock defaults to 2030-01-01T00:00:00Z**, and works with `Date` until the choice between `Date` and `Temporal` is made.
- **`compose.yaml` is the Postgres image's only home**, and the test harness reads the image from it, so the digest pin lives in one file. An env value read by both was rejected because Compose would need `--env-file` on every command.
- **SQL naming** is in the database migration and vertical slice patterns: snake_case, plural tables, IDs from code, and columns aliased to camelCase in queries.
- **Internal design is settled when each ticket is planned**, not in this spec: how the logger is reconfigured after configuration loads, the observability context without the OTel SDK, reading Hono's matched route, the metrics default, the span around `newTrace`, the harness's per-service `test` factory, Testcontainers' clean-up container, and template naming. The follow-up notes from the testing and observability sessions go into the tickets.
- **The first ticket is a database-free tracer**, covering server start, shutdown, `/health/live`, the logger, and the example service answering a test through the harness, so that type stripping and `--import` through workspace symlinks are proven before any database work. The database, jobs, telemetry and guard rails follow as their own slices through the example service.

## Testing

The feature is proven at three boundaries, because no single one can see all of it:

- **The example service's HTTP API, in-process, through the shared test harness.** This is the main boundary, the one [Test services mostly through their API, in-process](../../../docs/adr/0032-test-services-through-their-api.md) sets for every service. Tests send commands and queries through the typed client, run jobs explicitly and assert on responses, problem details and requests recorded by MSW. These tests prove:
  - transactions, job queuing and rollback (a command that fails leaves no message and no job);
  - payload validation and the domain-error and retry behaviour of jobs;
  - problem details, and 500s that reveal nothing;
  - idempotent receiving (a duplicate delivery is a no-op that answers success);
  - the harness's own fixtures: a fresh database per test, the clock, `runJobs` failing the test, and captured logs (for example, a domain error in a job logged as a warning).
- **The shared runtime's own tests**, for what in-process API tests skip:
  - start-up, graceful shutdown and the health endpoints, against a real server;
  - trace propagation, with an in-memory span exporter: HTTP to job to HTTP, new traces linked to their cause, retries as sibling spans, and annotated fields reaching log lines with and without the SDK.
- **CI and the maintainer's machine:**
  - **The guard rails:** a pull request shows the parallel jobs, the merged test report and the quality gate. The gate fails when a job fails. Lint and the `current.sql` check are each shown to fail once on a deliberate violation.
  - **One manual check:** with `vp run dev` running, sending a message produces one trace in Grafana containing the request, its queries, the job, the outbound call and the inbox request, with log lines linked. This is what confirms that the ESM instrumentation, `fetch` instrumentation and `--import` work under type stripping, which no in-process test can exercise.

## Out of scope

- **Any real domain:** tournaments, matches, players and users are batch B onwards.
- **The game protocol, the player protocol and the form of service-to-service clients:** sessions 7 and 8. The example service's outbound client is a plain dependency that will be rewritten.
- **Turning off trace extraction on the player gateway's player-facing routes** ([Ignore trace context from players](../../../docs/adr/0044-ignore-trace-context-from-players.md)): the gateway's tickets in batch B.
- **Authentication and ownership:** batch C.
- **The web frontend:** batch D.
- **Production images, image registries, deployment and production `OTEL_*` settings:** batch E.
- **Metrics:** off until wanted.
- **Testing retries with backoff and jobs scheduled for later,** which needs control of database time: decided when the first such job is written.
- **Reusing the test container across local runs:** added only if start-up time becomes a nuisance.
