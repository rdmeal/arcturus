---
type: plan
---

# Plan 06: Messages are stored and read back, tested against a fresh database

Implements [ticket 06](../tickets/06-messages-are-stored-and-read-back.md), part of [the spec](../spec.md).

## Context

- **Test boundary:** three boundaries, from the spec's Testing section:
  - the example service's HTTP API, in-process through the harness, for sending and reading messages, readiness with a database and the fixtures in use;
  - `service-runtime`'s own tests, for the database wrapper (self-deadlock, foreign connections, row validation) and readiness against an unreachable database;
  - the test packages' own tests (`test-database`, `service-testing`), for isolation, dropping, concurrent clones, templates and the clock.
- **ADRs:**
  - [0022: Open database transactions explicitly in handlers](../../../../docs/adr/0022-open-database-transactions-explicitly-in-handlers.md): the wrapper has only `transaction` and `read`, and every connection sets `lock_timeout` and `statement_timeout`.
  - [0011: Access PostgreSQL with Slonik](../../../../docs/adr/0011-access-postgresql-with-slonik.md): plain SQL, every row validated by `sql.type(schema)`. Pin Slonik's version.
  - [0034: Run test databases in Testcontainers](../../../../docs/adr/0034-run-test-databases-in-testcontainers.md): one container per run, from the root `globalSetup`, shared by every package's tests.
  - [0035: Give every test a fresh database from a migrated template](../../../../docs/adr/0035-give-every-test-a-fresh-database-from-a-template.md): `globalSetup` builds a template per service with Graphile Migrate's Node API and graphile-worker's `runMigrations`; each test clones it and drops it.
  - [0036: Build test data with fishery factories](../../../../docs/adr/0036-build-test-data-with-fishery-factories.md): fishery, after the supply-chain check. If the check fails, stop: a new ADR replaces this one.
  - [0020: Guard the dependency supply chain](../../../../docs/adr/0020-guard-the-dependency-supply-chain.md): every new package passes the release-age and trust checks on `vp install`; the Ryuk image is pinned by digest.
  - [0021: Structure services as vertical slices](../../../../docs/adr/0021-structure-services-as-vertical-slices.md): POST commands, GET queries, `/<area>/<slice>`.
  - [0049: Build every service's app from one runtime factory](../../../../docs/adr/0049-build-every-services-app-from-one-runtime-factory.md): `createServiceApp` gets its first option, `db`, because readiness now needs it.
  - [0016: Organise the repository as pnpm package-based workspaces](../../../../docs/adr/0016-organise-the-repository-as-pnpm-workspaces.md): the test packages are only ever dev dependencies.
- **Patterns:**
  - [vertical-slice](../../../../docs/patterns/vertical-slice.md), [database-transaction](../../../../docs/patterns/database-transaction.md), [service-api-test](../../../../docs/patterns/service-api-test.md) and [service-test-data](../../../../docs/patterns/service-test-data.md): this ticket establishes all four exemplars.
  - [service-composition-root](../../../../docs/patterns/service-composition-root.md): rules 11 (`main.ts` builds the database and the clock) and 14 (time from a `clock` dependency).
- **Planning decisions:**
  - **The area is `messaging`, not `messages`:** paths are `/messaging/send-message` and `/messaging/get-message`. The ticket's `/messages/…` names the area after a table, which vertical-slice rule 1 forbids, and the exemplar must follow its own rules.
  - **`created_at` comes from `clock.now()`,** passed in by `send-message`; the column's `now()` default stays (database-transaction rule 9 allows it). The test can then assert the exact creation time read back from the database, and the clock's `set` and `advance` are proven through the API.
  - **The wrapper:** `createDatabase(options)` returns `{ db, close }`. `db: Database` has only `transaction` and `read`, so closing the pool sits outside it (ADR 0022's two methods). Defaults: `lock_timeout` 5 s, `statement_timeout` 30 s; tests pass shorter values.
  - **Slonik's setup,** checked against its README through context7:
    - row validation needs a result-parser interceptor (`transformRowAsync`, validating with `resultParser["~standard"].validate` and throwing `SchemaValidationError`); without it `sql.type` checks nothing;
    - `statementTimeout` is a pool option;
    - there is no `lock_timeout` option, and `resetConnection` runs `DISCARD ALL` on release, which undoes a `SET`. So `lock_timeout` goes in the connection's startup `options` (`-c lock_timeout=…`), the value `DISCARD ALL` resets to;
    - `foreignConnections` stays at its default, `"reject"`: a query on the pool while a transaction is open in the same async context throws `UnexpectedForeignConnectionError`;
    - the `timestamptz` and `timestamp` parsers are replaced to produce a `Date`; Slonik's other default parsers stay. Row schemas use `z.date()`, and DTOs map with `.toISOString()`;
    - the README's examples pass `driverFactory: createPgDriverFactory()` from `@slonik/pg-driver`: add that package if `slonik` doesn't include the driver.
  - **Readiness:** `createServiceApp({ db })` runs `select 1` through `db.read` for `/health/ready`, answering `503` with `{ status: "not-ready" }` on failure. A service without a database calls `createServiceApp()`. `startServer` gets an `onClose` hook, run after the server has closed, so `main.ts` ends the pool then.
  - **The Postgres test infrastructure is its own package, `packages/test-database` (`@arcturus/test-database`),** with no dependency on `service-runtime`. `service-testing` depends on it, and `service-runtime` has it as a devDependency for its own database tests. Keeping it inside `service-testing` would make `service-runtime` and `service-testing` depend on each other, because the runtime's tests need a database and the harness needs the runtime.
  - **Migration detection moves to `packages/workspace` (`@arcturus/workspace`):** `findMigrationPackages` is shared by `tools/repo-checks` and `test-database`'s global setup.
  - **Templates are built up front in `globalSetup`,** as ADR 0035 says, not on first use. Up front needs no cross-worker locking and fails once, clearly; on first use would build only the templates a run needs (single files, CI shards), at the cost of an advisory lock and readiness checks in workers. Revisit if template builds show up in CI time: only `test-database` and each service's `test.ts` would change, and templates would then be named by a hash of their migrations.
  - **Templates are built from explicit settings** (`connectionString`, `migrationsFolder`), not from the service's `.gmrc.cjs`: loading it would load the service's env files into the main process and bring in the shadow-only `pg_dump` action. Migrate as the main database, never with `shadow` (plan 05's note). A built template is marked `IS_TEMPLATE true` with `ALLOW_CONNECTIONS false`.
  - **Naming:** the template is `<service folder>_template` (`example_template`); a test database is `<service folder>_test_<random hex>`, within Postgres's 63-character limit.
  - **The Postgres image is read with `docker compose config --format json`,** parsed with zod for `services.postgres.image`. It uses Compose's own parser and needs no dependency. `vp test` therefore needs Docker with the Compose plugin, which GitHub's hosted runners have.
  - **Ryuk stays on, pinned by digest,** locally and in CI, so a killed run doesn't leave containers behind. The pinned image is a constant in `test-database`'s global setup, set as `RYUK_CONTAINER_IMAGE` before Testcontainers loads, with a comment citing ADR 0020.
  - **Concurrent clones:** clone concurrently and prove it with a test. If Postgres rejects it ("source database is being accessed by other users"), serialise `CREATE DATABASE` with a `pg_advisory_lock` and record it in Notes.
  - **The `db` fixture is an opaque handle.** Its connection is reachable only through the subpath export `@arcturus/service-testing/direct-db`, which lint bans in every test file except a service's `src/test/direct-db.ts`. The `client` fixture builds `deps.db` from the same handle.
  - **Vitest 5 runs the root `globalSetup` once per run** and doesn't pass it on to projects (checked through context7), so one container serves every project, without `withReuse()`. Connection details reach tests through `provide` and `inject`; confirm in step 2 that the root project's `provide` reaches every project.
  - **Dependencies:**
    - `slonik` (and `@slonik/pg-driver` if needed) in `service-runtime`;
    - `@testcontainers/postgresql`, `graphile-migrate` and `graphile-worker` in `test-database`'s `dependencies`, which is dev-only because the package is only ever a dev dependency;
    - `fishery` as a devDependency of the example service.
  - **An unknown ID in `get-message` is left to ticket 07,** which adds it as `not-found` with problem details, rather than writing a temporary 404 now.
  - **Claude can't run Docker, even outside the sandbox** (plan 05's notes). The maintainer runs every database-backed `vp test` with `!`, one command per line. `vp check` runs outside the sandbox.
  - **Measuring:** temporary timing around clone and pool creation, run by the maintainer and then removed. If one clone and pool takes over about 150 ms, discuss falling back to one database per file.

## Steps

- [x] **1. Move migration-package detection into `@arcturus/workspace`**
  - **Goal:** `findMigrationPackages` lives in a package that tools and packages can both import. No behaviour changes, and the build stays green.
  - **Files:**
    - `packages/workspace/package.json` (new, `@arcturus/workspace`, private, `exports: { ".": "./src/index.ts" }`), `tsconfig.json` (as the other packages);
    - `packages/workspace/src/migration-packages.ts` and `.test.ts`: moved from `tools/repo-checks/src/` unchanged (`findMigrationPackages(root: string): Promise<string[]>`);
    - `packages/workspace/src/index.ts`: export `findMigrationPackages`;
    - `packages/workspace/README.md` (new): what the package is (facts about the workspace's layout, for tools and test infrastructure), its export, how to test it;
    - `tools/repo-checks/package.json`: depend on `@arcturus/workspace` (`workspace:*`); `tools/repo-checks/src/main.ts` imports from it; delete the old files; `tools/repo-checks/README.md` if it names the moved file;
    - `docs/develop/codebase.md`: the `packages/<name>` row says shared libraries that services, games and tools import.
  - **Read first:** the `writing-docs` skill; `docs/develop/writing-docs.md#package-readmes`.
  - **Tests:** the moved `migration-packages.test.ts` passes unchanged.
  - **Check:** `vp test packages/workspace`, `vp test tools/repo-checks`, then `vp check`

- [x] **2. `@arcturus/test-database`: one container per run, and empty cloned databases**
  - **Goal:** any package's tests can get an empty Postgres database of their own, on one container started per run from the image `compose.yaml` pins. `vp test` still passes everywhere with Docker running.
  - **Files:**
    - `packages/test-database/package.json` (new, `@arcturus/test-database`, private): add `@testcontainers/postgresql` and `pg` (with `@types/pg`, for the admin connection that creates and drops databases; the package doesn't need Slonik) with `vp install`; if a version fails the release-age or trust check, take the newest that passes and record it. Exports `.` (worker-side API) and `./global-setup`. `tsconfig.json`.
    - `packages/test-database/src/postgres-image.ts`: `readPostgresImage(repositoryRoot: string): Promise<string>`, running `docker compose config --format json` and parsing `services.postgres.image` with zod; it throws unless the image is pinned by digest.
    - `packages/test-database/src/global-setup.ts`: sets `RYUK_CONTAINER_IMAGE` to a digest-pinned constant (ADR 0020 comment) before importing Testcontainers; starts `PostgreSqlContainer` from the image; `provide("testDatabase", { host, port, user, password })`; stops the container in teardown. Declares `ProvidedContext` for `testDatabase`.
    - `packages/test-database/src/clone-database.ts`: `cloneDatabase(options: { template?: string; prefix: string; onCleanup: (fn: () => Promise<void>) => void }): Promise<{ name: string; connectionString: string }>` (exact shape settled in `/implement`): reads connection details with `inject`, runs `CREATE DATABASE <prefix>_test_<random hex> [TEMPLATE <template>]` over an admin connection, and drops the database (`WITH (FORCE)`) on cleanup.
    - `vite.config.ts`: `test.globalSetup: ["packages/test-database/src/global-setup.ts"]`.
    - `packages/test-database/README.md` (new): what it is, that it's only a dev dependency, the container, the image's single home, Ryuk, `cloneDatabase`, and that its tests need Docker.
  - **Read first:** [ADR 0034](../../../../docs/adr/0034-run-test-databases-in-testcontainers.md), [ADR 0020](../../../../docs/adr/0020-guard-the-dependency-supply-chain.md). Through context7: Vitest 5 `globalSetup`, `provide`/`inject` across projects and `ProvidedContext`; Testcontainers' `PostgreSqlContainer`, Ryuk configuration (`RYUK_CONTAINER_IMAGE`); Docker Compose `config --format json`.
  - **Tests:** `packages/test-database/src/clone-database.test.ts`:
    - "a cloned database starts empty";
    - "a table created in one test's database doesn't exist in another's";
    - "the database is dropped when the test ends" (the first of two ordered tests records its name; the second checks `pg_database`);
    - "several databases can be cloned at once" (`Promise.all` of several clones).

    `packages/test-database/src/postgres-image.test.ts`: "reads the digest-pinned postgres image from compose.yaml".

  - **Check:** (maintainer, with `!`) `vp test packages/test-database`, then `vp test`; then `vp check`

- [x] **3. Migrated templates, built in `globalSetup`**
  - **Goal:** every service with a database has a template migrated once per run, and `cloneDatabase` can clone from it. The build stays green.
  - **Files:**
    - `packages/test-database/package.json`: add `@arcturus/workspace`, `graphile-migrate` (the version the example service uses) and `graphile-worker`, after the supply-chain checks.
    - `packages/test-database/src/build-template.ts`: `buildTemplate(options: { admin: …; name: string; migrationsFolder: string }): Promise<void>`: creates the database, runs Graphile Migrate's Node API `migrate` with explicit settings (`connectionString`, `migrationsFolder`, no `afterAllMigrations`, not shadow), runs graphile-worker's `runMigrations`, then `ALTER DATABASE … IS_TEMPLATE true ALLOW_CONNECTIONS false`.
    - `packages/test-database/src/global-setup.ts`: after the container starts, `findMigrationPackages(repositoryRoot)` and `buildTemplate` for each, named `<folder basename>_template`.
    - `packages/test-database/test/fixtures/migrations/committed/…`: a one-table migration for the package's own tests (written with the Graphile Migrate hash header it needs).
    - `packages/test-database/README.md`: templates, naming, what goes in them (the committed migrations and `graphile_worker`), and that a test can't connect to a template.
  - **Read first:** [ADR 0035](../../../../docs/adr/0035-give-every-test-a-fresh-database-from-a-template.md), [database-migration](../../../../docs/patterns/database-migration.md), plan 05's Notes on the shadow-only `pg_dump`. Through context7: Graphile Migrate's Node API (`migrate`, settings), graphile-worker's `runMigrations`.
  - **Tests:** `packages/test-database/src/build-template.test.ts`:
    - "a database cloned from a built template has its migrated tables and the graphile_worker schema";
    - "a built template accepts no connections";
    - "several databases can be cloned from the same template at once".

    Plus, in `clone-database.test.ts`: "a database cloned from the example service's template has the messages table".

  - **Check:** (maintainer) `vp test packages/test-database`; then `vp check`

- [x] **4. `service-runtime`: the database wrapper**
  - **Goal:** services reach Postgres only through `transaction` and `read`, with rows validated and both timeouts on every connection. Nothing uses it yet outside tests.
  - **Files:**
    - `packages/service-runtime/package.json`: add `slonik` (pinned exactly, ADR 0011) and `@slonik/pg-driver` if needed; devDependency `@arcturus/test-database`.
    - `packages/service-runtime/src/database.ts` (new):
      - `interface Database { transaction: <T>(fn: (connection: DatabaseTransactionConnection) => Promise<T>) => Promise<T>; read: <T>(fn: (connection: DatabasePoolConnection) => Promise<T>) => Promise<T> }`;
      - `createDatabase(options: { connectionString: string; lockTimeoutMs?: number; statementTimeoutMs?: number }): Promise<{ db: Database; close: () => Promise<void> }>`: Slonik pool with the result-parser interceptor, `Date` parsers for `timestamptz` and `timestamp` (other defaults kept), `statementTimeout`, `lock_timeout` in the startup `options`, `foreignConnections: "reject"`. Defaults 5 000 ms and 30 000 ms.
    - `packages/service-runtime/src/index.ts`: export `createDatabase`, `type Database`, and re-export what slices need from Slonik (`sql`, the connection types) so services don't depend on Slonik directly (settle in `/implement`).
  - **Read first:** [ADR 0022](../../../../docs/adr/0022-open-database-transactions-explicitly-in-handlers.md), [ADR 0011](../../../../docs/adr/0011-access-postgresql-with-slonik.md), [database-transaction](../../../../docs/patterns/database-transaction.md) rules 1 to 4 and 12. Slonik's README through context7: runtime validation, `createPool` options, type parsers, `foreignConnections`, `resetConnection`.
  - **Tests:** `packages/service-runtime/src/database.test.ts`, each on a database from `cloneDatabase` with one table created in the test:
    - "a transaction waiting on a lock its own handler holds fails with a lock-timeout error" (two transactions from independent async contexts, a short `lockTimeoutMs`, on a pool whose connection has already been used and released, so `DISCARD ALL` is shown not to drop the timeout);
    - "a read opened inside a transaction is rejected";
    - "a row that doesn't match its schema is rejected";
    - "a timestamptz column is read as a Date";
    - "a transaction that throws is rolled back".
  - **Check:** (maintainer) `vp test packages/service-runtime/src/database.test.ts`; then `vp check`

- [x] **5. `service-runtime`: readiness, shutdown and the clock; the example service wired to its database**
  - **Goal:** `/health/ready` fails when the database is unreachable, the pool closes on shutdown, and the example service runs against its database with a system clock.
  - **Files:**
    - `packages/service-runtime/src/service-app.ts`: `createServiceApp(options?: { db?: Database })`; `health.ts` takes the optional `db` and answers `/ready` with `503 { status: "not-ready" }` when `db.read(… select 1 …)` fails.
    - `packages/service-runtime/src/server.ts`: `startServer({ …, onClose?: () => Promise<void> })`, run after the server closes.
    - `packages/service-runtime/src/clock.ts` (new): `interface Clock { now: () => Date }`, `systemClock`. Export both.
    - `services/example/src/config.ts`: `DATABASE_URL` setting, `config.database.connectionString`.
    - `services/example/src/app.ts`: `Deps` gains `db: Database` and `clock: Clock`; `createServiceApp({ db: deps.db })`.
    - `services/example/src/main.ts`: `createDatabase`, `systemClock`, `startServer({ …, onClose: close })`.
    - `services/example/src/test/test.ts`: kept compiling until step 6 (e.g. `testConfig` gains a placeholder `DATABASE_URL`, and `createApp` gets a temporary db and clock only if needed; settle in `/implement`).
    - `.env.development`: Claude can't read it. Hand the maintainer the key to add: `DATABASE_URL` (the example role's URL, as `gmrc.ts` already reads it).
  - **Read first:** [service-composition-root](../../../../docs/patterns/service-composition-root.md) rules 11, 14, 18 and 19; [ADR 0049](../../../../docs/adr/0049-build-every-services-app-from-one-runtime-factory.md).
  - **Tests:**
    - `packages/service-runtime/src/service-app.test.ts`: "ready answers not-ready when the database is unreachable" (a `createDatabase` pointed at a closed port, no Docker needed); "ready answers ready when the database answers" (on a `cloneDatabase` database); "ready answers ready for a service without a database".
    - `packages/service-runtime/src/server.test.ts`: "onClose runs after the server has closed".
  - **Check:** `vp test packages/service-runtime` (maintainer, for the database test), `vp test services/example`; then `vp check`

- [x] **6. `service-testing`: the `db` and `clock` fixtures**
  - **Goal:** a service's tests get a fresh database from its template and a fixed clock, and the `client` is built with both. The example service's tests use them.
  - **Files:**
    - `packages/service-testing/package.json`: depend on `@arcturus/test-database`; add the `./direct-db` subpath export.
    - `packages/service-testing/src/create-service-test.ts`:
      - option `database?: string` (the service folder name, e.g. `"example"`), whose template is `<database>_template`;
      - `createApp: (fixtures: { config: TConfig; db: Database; clock: Clock }) => TApp`;
      - `db` fixture: `cloneDatabase` from the template, `createDatabase` on it, closed then dropped on cleanup; its value is an opaque `TestDatabase` handle;
      - `clock` fixture: `TestClock` with `now()`, `set(instant: Date | string)` and `advance(milliseconds: number)`, starting at `2030-01-01T00:00:00Z`;
      - `client` depends on `config`, `db` and `clock`.
    - `packages/service-testing/src/direct-db.ts` (new): `connectionOf(db: TestDatabase): Database` (name settled in `/implement`), exported only as `@arcturus/service-testing/direct-db`.
    - `packages/service-testing/src/index.ts`: export `TestClock`, `TestDatabase`.
    - `vite.config.ts`: `testImportBans` also bans `@arcturus/service-testing/direct-db`, with an override allowing it in `**/src/test/direct-db.ts` (message citing service-api-test rule 13).
    - `docs/develop/linting.md`: the guard-rails section names the new ban, if it lists the existing ones.
    - `services/example/src/test/test.ts`: `database: "example"`, `testConfig` with a placeholder `DATABASE_URL` (the fixture builds `db` from the clone), `createApp: ({ config, db, clock }) => createApp({ config, db, clock })`.
  - **Read first:** [service-api-test](../../../../docs/patterns/service-api-test.md) rules 4, 5, 13 and 18; [linting](../../../../docs/develop/linting.md) guard rails. Vitest fixture docs through context7 (fixture dependencies, `onCleanup`, injected values).
  - **Tests:**
    - `packages/service-testing/src/clock.test.ts`, with a tiny `createServiceApp()` app returning `clock.now()`: "the clock starts at 2030-01-01T00:00:00Z"; "set changes what the service reads as now"; "advance moves what the service reads as now forward".
    - `services/example/src/health.test.ts`: "ready answers ready with the service's database" (added to the existing file).
    - Lint: a scratch test file importing `@arcturus/service-testing/direct-db` fails `vp check` (shown once, not committed).
  - **Check:** (maintainer) `vp test packages/service-testing`, `vp test services/example`; then `vp check`

- [x] **7. The `messaging` slices: `send-message` and `get-message`**
  - **Goal:** a client sends a message and reads it back with its creation time from the database, through vertical slices that reach the database only through the wrapper.
  - **Files:**
    - `services/example/src/messaging/send-message/{route,schemas,handler,queries}.ts`: `POST /messaging/send-message`, input `{ body: string }`, `201 { id }`. Handler `sendMessage(deps: Pick<Deps, "db" | "clock">, input)`: `crypto.randomUUID()`, inserts with `created_at` = `deps.clock.now()` inside `deps.db.transaction`.
    - `services/example/src/messaging/get-message/{route,schemas,handler,queries}.ts`: `GET /messaging/get-message?id=…`, `200 { id, body, createdAt }` (ISO string). Handler `getMessage(deps: Pick<Deps, "db">, input)` with `deps.db.read`; row schema aliases `created_at AS "createdAt"` as `z.date()`.
    - `services/example/src/messaging/router.ts`; `services/example/src/app.ts` chains `.route("/messaging", messagingRouter(deps))`.
    - `services/example/package.json`: add `@hono/zod-validator` if not present; devDependency `fishery` after checking its release history, transitive dependencies and trust level (stop if it fails: ADR 0036's consequence).
    - `services/example/src/test/factories/send-message-input.factory.ts`: `sendMessageInputFactory` typed from `z.infer<typeof sendMessageInput>`.
    - `services/example/src/test/arrange.ts`: `sendMessage(client, overrides?)` returning the new ID.
  - **Read first:** [vertical-slice](../../../../docs/patterns/vertical-slice.md) (all rules), [database-transaction](../../../../docs/patterns/database-transaction.md) rules 1 to 4, 9 and 10, [service-api-test](../../../../docs/patterns/service-api-test.md) rules 1, 9, 10, 12, 15 and 16, [service-test-data](../../../../docs/patterns/service-test-data.md) rules 1 to 5. `@hono/zod-validator` and fishery docs through context7.
  - **Establishes:** [vertical-slice](../../../../docs/patterns/vertical-slice.md), [database-transaction](../../../../docs/patterns/database-transaction.md), [service-api-test](../../../../docs/patterns/service-api-test.md), [service-test-data](../../../../docs/patterns/service-test-data.md)
  - **Tests:**
    - `services/example/src/messaging/send-message/send-message.test.ts` (`describe("POST /messaging/send-message")`): "answers 201 with the new message's ID"; "rejects a message without a body" (400, through `app.request()` only if the typed client can't send it).
    - `services/example/src/messaging/get-message/get-message.test.ts` (`describe("GET /messaging/get-message")`): "returns a sent message with its body and creation time" (`createdAt` is `2030-01-01T00:00:00.000Z`); "returns the later creation time for a message sent after the clock advances".
  - **Check:** (maintainer) `vp test services/example`; then `vp check`

- [x] **8. Measure the time to clone a database and open a pool for each test**
  - **Goal:** the cost per test is known and recorded, and the per-test database is kept or the fallback discussed.
  - **Files:** temporary timing around `cloneDatabase` and `createDatabase` in the `db` fixture (`performance.now()`), removed after the run; this plan's Notes.
  - **Read first:** [ADR 0035](../../../../docs/adr/0035-give-every-test-a-fresh-database-from-a-template.md)'s consequences.
  - **Tests:** none.
  - **Check:** (maintainer) `vp test services/example` a few times; record the median and spread of clone and pool times in Notes (for the PR). Then `git diff` shows no timing code left.

- [x] **9. Contributor docs and READMEs**
  - **Goal:** contributors know that `vp test` needs Docker with Compose, that Claude runs database tests outside its sandbox, and how the harness and the database wrapper work.
  - **Files:**
    - `docs/develop/getting-started.md` and `docs/develop/commands.md`: `vp test` needs Docker running, with the Compose plugin.
    - `docs/develop/claude-code.md`: database-backed tests use the Docker socket, so they run outside Claude's sandbox (and in this repository the maintainer runs them).
    - `packages/service-testing/README.md`: the `database` option, the `db` and `clock` fixtures, `createApp`'s new arguments, the `direct-db` subpath; link `test-database`'s README for the container, templates and cloning rather than repeating it.
    - `packages/service-runtime/README.md`: `createDatabase` and `Database`, `createServiceApp({ db })` and readiness, `startServer`'s `onClose`, `Clock` and `systemClock`.
    - `services/example/README.md`: the `messaging` area and that it needs `DATABASE_URL`.
    - `docs/develop/codebase.md`: the two new packages, if it lists shared packages beyond the table.
  - **Read first:** the `writing-docs` skill; `docs/develop/writing-docs.md#package-readmes`.
  - **Tests:** none.
  - **Check:** `vp check`

- [x] **10. Pattern exemplars**
  - **Goal:** each pattern this ticket establishes names the example service's code.
  - **Files:**
    - `docs/patterns/vertical-slice.md`: Exemplar: `services/example/src/messaging/` (`send-message` as a command, `get-message` as a query, `router.ts`).
    - `docs/patterns/database-transaction.md`: Exemplar: `send-message/handler.ts` (a transaction), `get-message/handler.ts` (a read), and `packages/service-runtime/src/database.ts` (the wrapper and its timeouts).
    - `docs/patterns/service-api-test.md`: Exemplar: `services/example/src/test/test.ts`, the two slice tests, `arrange.ts`.
    - `docs/patterns/service-test-data.md`: Exemplar: `services/example/src/test/factories/send-message-input.factory.ts`.
    - `docs/patterns/service-composition-root.md`: its exemplar text no longer says the service has no database; `main.ts` builds the database and the clock.
  - **Read first:** the `writing-docs` skill and the `pattern` skill.
  - **Tests:** none.
  - **Check:** `vp check`

**11. Acceptance criteria**, checked at the test boundary:

- [x] Sending a message answers `201` with its ID, and getting it by that ID returns it, with its creation time from the database: proven by "answers 201 with the new message's ID" in `services/example/src/messaging/send-message/send-message.test.ts` and "returns a sent message with its body and creation time" in `services/example/src/messaging/get-message/get-message.test.ts`.
- [x] Slices can only open a transaction or a read. The wrapper offers no way to run a query directly: proven by the `Database` type in `packages/service-runtime/src/database.ts` (only `transaction` and `read`), and by "a read opened inside a transaction is rejected" in `packages/service-runtime/src/database.test.ts`.
- [x] A self-deadlock (a second transaction waiting on the first) fails with a lock-timeout error rather than hanging. This is shown in the runtime's own tests: proven by "a transaction waiting on a lock its own handler holds fails with a lock-timeout error" in `packages/service-runtime/src/database.test.ts`.
- [x] `/health/ready` answers not-ready when the database is unreachable: proven by "ready answers not-ready when the database is unreachable" in `packages/service-runtime/src/service-app.test.ts`.
- [x] Each test gets an empty database that no other test sees, and it is dropped when the test ends. Several workers can clone the same template at once: proven by "a cloned database starts empty", "a table created in one test's database doesn't exist in another's", "the database is dropped when the test ends" and "several databases can be cloned at once" in `packages/test-database/src/clone-database.test.ts`, and "several databases can be cloned from the same template at once" in `packages/test-database/src/build-template.test.ts`.
- [x] The test harness reads the Postgres image from `compose.yaml`, so the digest has one home: proven by "reads the digest-pinned postgres image from compose.yaml" in `packages/test-database/src/postgres-image.test.ts`, and `global-setup.ts` starting the container from it.
- [x] The clock fixture defaults to 2030-01-01T00:00:00Z, and `set()` and `advance()` change what the service reads as now: proven by the three tests in `packages/service-testing/src/clock.test.ts`, and end to end by "returns the later creation time for a message sent after the clock advances" in `get-message.test.ts`.
- [x] `vp test` needs only Docker, not the Compose stack, and passes in CI on GitHub's hosted runners: proven by the maintainer running `vp test` with the Compose stack stopped (`vp run infra:down`), and by the PR's test shards passing.
- [x] The time to create a database and pool per test is measured and recorded in the pull request. If it is too slow, fall back to one database per test file: proven by step 8's Notes, copied into the PR.
- [x] Getting started and the commands guide say that `vp test` needs Docker running. The Claude Code contributor guide says database-backed tests run outside Claude's sandbox: proven by step 9.
- [x] The exemplars of these patterns name the example service's code: vertical slices, database transactions, service API tests and service test data: proven by step 10.
- [x] The test harness package's README, started in ticket 04, also describes the container, the templates, cloning and the new fixtures: proven by step 9's `service-testing` README, linking `test-database`'s README from steps 2 and 3.

## Notes

- 2026-11-25, during planning: the ticket's paths `/messages/send-message` and `/messages/get-message` became `/messaging/…` (vertical-slice rule 1). Test-database infrastructure became its own package, and migration detection moved to `@arcturus/workspace`, both to keep dependencies one-way (see Planning decisions).
- 2026-11-25: Step 2: every `vp test` run now starts the container through the root `globalSetup`, so **Claude can't run any `vp test`, even a package with no database tests**: the maintainer runs them all with `!`. The provided key is `testDatabaseServer` (`{ host, port, username, password }`, type `TestDatabaseServer` in `provided-context.ts`). Vitest's `ProvidedContext` is augmented as `declare module "vite-plus/test"`, because `vitest` doesn't resolve from workspace packages. `readPostgresImage` is synchronous (`execFileSync`), because lint's `strict-void-return` rejects `promisify(execFile)`. Use `pg`'s named exports (`Client`, `escapeIdentifier`): lint rejects `pg.Client` through the default import.
- 2026-11-25: Step 2: `@testcontainers/postgresql` brings build scripts from `ssh2`, `cpu-features` and `protobufjs` (through dockerode). The maintainer denied all three in `pnpm-workspace.yaml`'s `allowBuilds`. Ryuk is `testcontainers/ryuk:0.14.0`, pinned by digest in `global-setup.ts`.
- 2026-11-25: Step 2: lint treats `packages/test-database/**` as test-only, and bans `@arcturus/test-database` from production code. Service-api-test rules 2 and 3, `linting.md` and `codebase.md` say so.
- 2026-11-25: **Plan change (step 3), agreed with the maintainer:** step 3 adds "several databases can be cloned from the same template at once", so the concurrent-clone criterion is proven against a migrated template, not only `template0`.
- 2026-11-25: Step 3: graphile-worker 0.18.0 brings `graphile-config`, which lists `@types/node` ^22 as a runtime dependency, and its `undici-types@6.21.0` failed the no-downgrade trust check. The maintainer chose a pnpm override in `pnpm-workspace.yaml` (`"graphile-config>@types/node": ^26.6.6`). Graphile Migrate keeps its pool for 200 ms after `migrate` returns and calls `process.exit(1)` if an idle connection is killed, so `buildTemplate` waits for `pg_stat_activity` to show no connections before marking the template. Never terminate a database's connections right after migrating it.
- 2026-11-25: Step 3: a service's database name, which step 6's `createServiceTest({ database })` takes, is the second segment of its folder (`services/example` is `example`, `games/<game>/service` is `<game>`), with hyphens as underscores. `templateName(database)` from `@arcturus/test-database` gives `<database>_template`.
- 2026-11-25: Step 4: Slonik 49.13.0 is pinned exactly and includes its pg driver (no `@slonik/pg-driver` needed). `statementTimeout` reaches Postgres as a startup parameter, and `lock_timeout` goes in the URL's `options` (`-c lock_timeout=…`), so both survive `DISCARD ALL`. `service-runtime` re-exports `sql` and the types `CommonQueryMethods`, `DatabasePoolConnection` and `DatabaseTransactionConnection`: services import them from `@arcturus/service-runtime` and never depend on Slonik directly. `db.read` inside `db.transaction` throws Slonik's `UnexpectedForeignConnectionError`. A `timestamp` without a time zone is read as UTC.
- 2026-11-25: Step 5: Slonik's pg driver connects when the pool is created, to look up type OIDs, so `createDatabase` rejects when the database is unreachable and a service can't start without its database. Readiness is therefore tested against a database dropped after the pool opened. `services/example/.env.development` already had `DATABASE_URL`. Until step 6, `services/example/src/test/test.ts` passes a stand-in `Database` that rejects every call, plus `systemClock`; step 6 replaces both with the `db` and `clock` fixtures.
- 2026-11-25: Step 6: `connectionOf(db)` from `@arcturus/service-testing/direct-db` gives a service's `src/test/direct-db.ts` the `Database` behind the `db` fixture. The existing `**/direct-db` lint pattern already bans the subpath in test files; a `vite.config.ts` override turns the ban off in `**/src/test/direct-db.ts`. A service without a `database` option gets a `db` whose `Database` rejects every call. `services/example/src/test/test.ts` still passes a placeholder `DATABASE_URL`, because `parseConfig` requires it. The readiness test is `services/example/src/health-ready.test.ts` (one `describe` per endpoint, rule 15).
- 2026-11-25: Step 7: `service-runtime`'s `sql` is now `createSqlTag` with a `void` type alias (`z.object({}).strict()`), as Slonik's README recommends, for statements that return no rows; `sql.timestamp(date)` binds a `Date`. Vertical-slice rules 8 (a route's status is a named constant, because of `no-magic-numbers`) and 13 (`CommonQueryMethods`, `sql.typeAlias("void")`, `sql.timestamp`, imports from `@arcturus/service-runtime`) were clarified on this branch. fishery 2.4.0 (thoughtbot, one dependency: `lodash.mergewith`) passed the supply-chain checks. The test of an empty body is "rejects a message with an empty body": the typed client can't omit `body`. An unknown ID in `get-message` answers 500 (Slonik's `NotFoundError` from `one`) until ticket 07.
- 2026-11-25: Possible pattern: reading a typed-client response body in a test with a zod schema, because the client can't narrow the body by status (`services/example/src/messaging/send-message/send-message.test.ts`).
- 2026-11-25: Step 8, measured on the maintainer's machine (WSL 2), over three runs of `vp test services/example` (21 databases): cloning a database from the template took a median of 86 ms (40 to 127 ms), and creating its pool, including Slonik's first connection to look up type IDs, a median of 16 ms (10 to 30 ms). Together a median of 102 ms (50 to 145 ms) per test, under the 150 ms threshold, so each test keeps its own database. For the PR.
- 2026-11-25: Step 11: with the Compose stack stopped (`vp run infra:down`), `vp test` passed 59 tests in 18 files on the maintainer's machine. Two criteria stay open until the pull request: `vp test` passing on GitHub's hosted runners (the PR's test shards), and the step 8 measurement copied into the PR description.
- 2026-11-25: **Plan change, from the maintainer:** the Claude Code guide doesn't describe the sandbox, because that is the maintainer's own setup, not the repository's. The "Running tests" section was removed, and the fact lives in Claude's private memory instead. The acceptance criterion's second half (the Claude Code guide saying database-backed tests run outside the sandbox) is dropped; getting started and the commands guide still say `vp test` needs Docker.
- 2026-11-25: The draft PR's test shards passed on GitHub's hosted runners (21 and 38 tests, 59 in all), so the CI criterion is ticked. In CI, Vitest printed passing tests' log lines too, although they stay hidden locally; service-api-test rule 18 says logs show only for failing tests.
- 2026-11-25: The maintainer ticked the timing criterion. To make CI match service-api-test rule 18, the root `vite.config.ts` sets Vitest's `silent: "passed-only"`, so passing tests' logs are hidden everywhere.
