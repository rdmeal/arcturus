---
type: ticket
status: done
blocked-by: ["05"]
scopes: [arcturus]
---

# 06: Messages are stored and read back, tested against a fresh database

Part of [the spec](../spec.md); delivers user stories 2 (readiness: database), 4, 17 (the db and clock fixtures), 19, 20 and 26 (Docker and Claude's sandbox).

## What to build

- **Sending and reading:** a client sends a message with `POST /messages/send-message` and gets back an acknowledgement with the message's ID. `GET /messages/get-message` returns the message and when it was created. There is no delivery yet.
- **The database wrapper:** both slices reach the database only through the shared runtime's wrapper, which offers an explicit transaction and an explicit read. Every connection sets a lock timeout and a statement timeout.
- **Readiness:** `/health/ready` now fails when the service can't reach its database.
- **Tests:**
  - every test gets its own fresh, empty database, cloned from a template migrated once per run, in a Postgres container started by Testcontainers from the same image `compose.yaml` pins;
  - a clock fixture fixes time at 2030-01-01T00:00:00Z, which a test can set or advance;
  - tests arrange through the API with helpers, and build request bodies with fishery factories;
  - CI runs these tests on GitHub's hosted runners.

## Acceptance criteria

- [ ] Sending a message answers `201` with its ID, and getting it by that ID returns it, with its creation time from the database.
- [ ] Slices can only open a transaction or a read. The wrapper offers no way to run a query directly.
- [ ] A self-deadlock (a second transaction waiting on the first) fails with a lock-timeout error rather than hanging. This is shown in the runtime's own tests.
- [ ] `/health/ready` answers not-ready when the database is unreachable.
- [ ] Each test gets an empty database that no other test sees, and it is dropped when the test ends. Several workers can clone the same template at once.
- [ ] The test harness reads the Postgres image from `compose.yaml`, so the digest has one home.
- [ ] The clock fixture defaults to 2030-01-01T00:00:00Z, and `set()` and `advance()` change what the service reads as now.
- [ ] `vp test` needs only Docker, not the Compose stack, and passes in CI on GitHub's hosted runners.
- [ ] The time to create a database and pool per test is measured and recorded in the pull request. If it is too slow, fall back to one database per test file, as [Give every test a fresh database from a migrated template](../../../../docs/adr/0035-give-every-test-a-fresh-database-from-a-template.md) allows.
- [ ] Getting started and the commands guide say that `vp test` needs Docker running. The Claude Code contributor guide says database-backed tests run outside Claude's sandbox.
- [ ] The exemplars of these patterns name the example service's code: vertical slices, database transactions, service API tests and service test data.
- [ ] The test harness package's README, started in ticket 04, also describes the container, the templates, cloning and the new fixtures.

## Notes

- **Settled when planning:**
  - the template naming;
  - how a service declares that it has a database and where its migrations are (perhaps from its `.gmrc`);
  - building the template with Graphile Migrate's Node API, plus graphile-worker's migrations so ticket 08 can queue jobs;
  - whether Vitest's root `globalSetup` runs once for all projects or once per project (if per project, share one container with `withReuse()`), and passing connection details with `provide` and `inject`;
  - how the `db` fixture's connection reaches only a service's `direct-db` module;
  - the lock and statement timeout values;
  - Ryuk: pin its image under [Guard the dependency supply chain](../../../../docs/adr/0020-guard-the-dependency-supply-chain.md), or disable it in CI.
- **Before adding fishery,** check its release history, transitive dependencies and trust level against the supply-chain ADR. If it fails, a new ADR replaces [Build test data with fishery factories](../../../../docs/adr/0036-build-test-data-with-fishery-factories.md). Install Testcontainers and fishery as dev dependencies only.
- **Claude's sandbox blocks the Docker socket,** so database tests have to run outside it.
- **Decisions:**
  - [Open database transactions explicitly in handlers](../../../../docs/adr/0022-open-database-transactions-explicitly-in-handlers.md)
  - [Access PostgreSQL with Slonik](../../../../docs/adr/0011-access-postgresql-with-slonik.md)
  - [Run test databases in Testcontainers](../../../../docs/adr/0034-run-test-databases-in-testcontainers.md)
  - [Structure services as vertical slices with a task-based API](../../../../docs/adr/0021-structure-services-as-vertical-slices.md)
- **Patterns:**
  - [vertical slices](../../../../docs/patterns/vertical-slice.md)
  - [database transactions](../../../../docs/patterns/database-transaction.md)
  - [service API tests](../../../../docs/patterns/service-api-test.md)
  - [service test data](../../../../docs/patterns/service-test-data.md)
