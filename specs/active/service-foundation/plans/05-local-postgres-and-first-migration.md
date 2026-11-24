---
type: plan
---

# Plan 05: Local Postgres and the example service's first migration

Implements [ticket 05](../tickets/05-local-postgres-and-first-migration.md), part of [the spec](../spec.md).

## Context

- **Test boundary:** CI and the maintainer's machine, from the spec's Testing section. There are no automated tests: each step is proven by commands run by hand, and the `current.sql` repo check is shown failing once on the pull request.
- **ADRs:**
  - [0030: Run infrastructure in Compose and services on the host](../../../../docs/adr/0030-run-infrastructure-in-compose-and-services-on-the-host.md): Compose runs only Postgres. No images of our own code.
  - [0013: Migrate databases with Graphile Migrate](../../../../docs/adr/0013-migrate-databases-with-graphile-migrate.md): plain SQL, forward-only, hash-chained. Migrations run as a script step before `dev`, never on service start-up.
  - [0020: Guard the dependency supply chain](../../../../docs/adr/0020-guard-the-dependency-supply-chain.md): the image is pinned as `postgres:<version>@sha256:…`. `graphile-migrate` passes the release-age and trust checks on `vp install`.
  - From the spec's Decisions: `compose.yaml` is the Postgres image's only home. Ticket 06's test harness reads the image from it.
- **Patterns:**
  - [database migration](../../../../docs/patterns/database-migration.md): every rule. This ticket establishes its exemplar.
  - [service composition root](../../../../docs/patterns/service-composition-root.md): the env files, read in the order `.env`, then `.env.development`.
- **Planning decisions:**
  - **Image:** `postgres:19.0@sha256:766ddae4967301b9802b341bb596905f11dd5c558149690a7a4d80c2f61bbcf9`. 19 was the current major on 2026-11-23 (postgresql.org `versions.json`), and the digest is from `docker buildx imagetools inspect postgres:19.0`. The image is the Debian variant, not Alpine, for predictable collation. Testcontainers will pull the same image in ticket 06.
  - **Where the files go:** `compose.yaml` at the repository root. The init script goes in a new top-level `infra/postgres/init/` folder, mounted into `/docker-entrypoint-initdb.d`. It doesn't go in `tools/`, because `tools/*` is a pnpm workspace glob for packages.
  - **The init script is SQL that is safe to re-run** (`select 'create …' where not exists (…) \gexec`), so the local development guide's "re-run the init script against the running container" works as written. One block per service. For the example service:
    - role `example`, with login and password `example` (local only, not a secret);
    - databases `example` and `example_shadow`, both owned by `example`;
    - `revoke all on database … from public` on both, matching what `graphile-migrate reset` does.
  - **Compose:**
    - a `pg_isready` healthcheck;
    - a named volume `postgres-data`;
    - `POSTGRES_PASSWORD: postgres`;
    - the port as `${POSTGRES_PORT:-5432}:5432`, so the root `.env` can override it.
  - **Infrastructure scripts:** in the root `package.json`, `infra:up` is `docker compose up -d --wait` and `infra:down` is `docker compose down`.
  - **`graphile-migrate` is a devDependency of the example service.** Only its scripts use it. The test harness takes its own dependency in ticket 06.
  - **`db:reset` is `graphile-migrate reset --erase`.** The command refuses to run without `--erase`.
  - **`schema.sql` is dumped from the shadow database only:** the `afterAllMigrations` command action has `"shadow": true`, and dumps `"$GM_DBNAME"`.
    - The shadow database is built from the committed migrations alone, so the dump matches what is committed, without leftovers from `current.sql`.
    - `commit` migrates both the shadow and the main database, so without the flag it would dump twice.
    - The test harness migrates a database that isn't the shadow, so the dump never runs in tests (ticket 06).
    - The cost: a plain `dev` migrate doesn't regenerate `schema.sql`. `commit`, `uncommit` and `reset --shadow` do, which is exactly when the committed schema changes.
  - **The dump command:** `docker compose exec -T postgres pg_dump -U postgres --schema-only --no-owner --no-privileges --exclude-schema=graphile_migrate --exclude-schema=graphile_worker "$GM_DBNAME" > schema.sql`.
    - It is checked against the Graphile Migrate README's own `pg_dump` example.
    - `$GM_DBNAME` is used rather than `$GM_DBURL`, because the host port can differ from the one inside the container.
    - Compose finds `compose.yaml` by searching the parent folders of the service package. Check this in step 2.
  - **The messages table:** `id uuid primary key` (no default), `body text not null`, `created_at timestamptz not null default now()`.
  - **"The service connects as its own role":** the service has no database code until ticket 06. Here it is proven by `migrate` running as `DATABASE_URL`'s `example` role, and by `\l` showing `example` as the owner. Ticket 06's readiness check proves it for the running service.
  - **Docker commands run outside Claude's sandbox,** which blocks Docker's unix socket. An implementing session runs `docker` and `vp run infra:*` with the sandbox disabled, or asks the maintainer to run them.

## Steps

- [x] **1. Run Postgres in Compose, with a role, database and shadow database for the example service**
  - **Goal:** `vp run infra:up` starts Postgres and returns once it's healthy, and on a fresh volume the example service's role and databases exist. Nothing else changes, so the build stays green.
  - **Files:**
    - `compose.yaml`: new. The `postgres` service with the pinned image, healthcheck, `postgres-data` volume, port variable and `./infra/postgres/init:/docker-entrypoint-initdb.d:ro` mount. A comment says that the test harness reads the image from here.
    - `infra/postgres/init/01-service-databases.sql`: new. The re-runnable script, with a header comment saying how to re-run it: `docker compose exec -T postgres psql -U postgres -f /docker-entrypoint-initdb.d/01-service-databases.sql`.
    - `package.json` (root): the `infra:up` and `infra:down` scripts.
  - **Read first:** ADR 0030, and ADR 0020's "Pinned actions and images" bullet. In the local development guide, the "Ports" and "Databases and migrations" sections.
  - **Tests:** none (manual check).
  - **Check:**
    1. `docker compose down -v`, then `vp run infra:up`: it returns only once the container is healthy.
    2. `docker compose exec postgres psql -U postgres -c '\l'` lists `example` and `example_shadow`, owned by `example`.
    3. Re-run the init script against the running container: it succeeds and changes nothing.
    4. `vp run infra:down` stops the container.
    5. `vp check`.
- [x] **2. Set up Graphile Migrate in the example service**
  - **Goal:** the example service has `.gmrc`, `migrations/` and the three scripts, with no migration yet. `dev` migrates (nothing to run), then starts. The build and the repo checks stay green.
  - **Files:**
    - `services/example/package.json`:
      - `graphile-migrate` as a devDependency, added with `vp install`, which must pass the release-age and trust checks;
      - `dev` becomes `graphile-migrate migrate && node --watch --import @arcturus/service-runtime/telemetry src/main.ts`;
      - new scripts `db:watch` (`graphile-migrate watch`) and `db:reset` (`graphile-migrate reset --erase`).
    - `services/example/gmrc.ts`: the typed configuration (`satisfies Settings`, exported as `settings`). It loads `.env` and `.env.development` into `process.env` with dotenv's `config()`, in the same order as `src/config.ts`. `afterAllMigrations` holds the shadow-only `pg_dump` command action from Planning decisions. (Changed 2026-11-23, see Notes.)
    - `services/example/.gmrc.cjs`: a one-line shim, `module.exports = require("./gmrc.ts").settings`.
    - `services/example/tsconfig.json`: `include` adds `gmrc.ts`.
    - `services/example/migrations/current.sql`: comments only.
    - `services/example/migrations/committed/`: kept, with a `.gitkeep` if `init` doesn't create a file in it.
    - `services/example/.env.development`: **the maintainer adds these keys**, and the session asks for this rather than editing the file (Claude can't read it). Values for the default port:
      - `DATABASE_URL=postgres://example:example@localhost:5432/example`
      - `SHADOW_DATABASE_URL=postgres://example:example@localhost:5432/example_shadow`
      - `ROOT_DATABASE_URL=postgres://postgres:postgres@localhost:5432/postgres`

      Anyone overriding `POSTGRES_PORT` in the root `.env` also overrides these three URLs in the service's `.env`.
  - **Read first:** the [database migration](../../../../docs/patterns/database-migration.md) pattern, rules 1 to 4. The [service composition root](../../../../docs/patterns/service-composition-root.md) pattern's rule on env files. Graphile Migrate's README on `.gmrc` and command actions (through context7, `/graphile/migrate`).
  - **Tests:** none (manual check).
  - **Check:**
    1. With `vp run infra:up` running, `vp run --filter @arcturus/example-service dev` reports no committed migrations to run, then the service answers `GET /health/live` on port 3900.
    2. `vp run --filter @arcturus/example-service db:reset` succeeds.
    3. `node tools/repo-checks/src/main.ts` passes, with no `DATABASE_URL` set in the shell, because CI has none.
    4. `vp check`.
- [x] **3. Write the messages migration in `current.sql` under `db:watch`, and show the repo check failing**
  - **Goal:** the messages table exists in the development database, written through the pattern's workflow. Pushing this commit makes the pull request's "Repo checks" job fail on the non-blank `current.sql`. That failure is deliberate: it is ticket 03's deferred acceptance criterion. Every other job stays green.
  - **Files:** `services/example/migrations/current.sql`:
    1. an undo section, `drop table if exists messages cascade;`;
    2. `create table messages (id uuid primary key, body text not null, created_at timestamptz not null default now());`.
  - **Read first:** the [database migration](../../../../docs/patterns/database-migration.md) pattern, rules 5 to 11.
  - **Tests:** none (manual check).
  - **Check:**
    1. With `vp run --filter @arcturus/example-service db:watch` running, save `current.sql` twice: both runs apply cleanly.
    2. `docker compose exec postgres psql -U example -d example -c '\d messages'` shows the table.
    3. `node tools/repo-checks/src/main.ts` fails for `services/example`.
    4. The maintainer pushes, opens the draft pull request and confirms that "Repo checks" fails and the quality gate fails with it. Record the run's link in Notes.
- [ ] **4. Commit the migration and its schema dump**
  - **Goal:** the migration is in the hash-chained history, `current.sql` holds only comments, and `schema.sql` is regenerated from the shadow database. Pushing turns "Repo checks" green again.
  - **Files:**
    - `services/example/migrations/committed/000001.sql`: written by `graphile-migrate commit -m "Create the messages table"`, run through `dotenv run` like the scripts.
    - `services/example/migrations/current.sql`: back to comments only (`commit` does this).
    - `services/example/schema.sql`: new, written by the shadow-only dump.
  - **Read first:** the [database migration](../../../../docs/patterns/database-migration.md) pattern, rules 12 to 17.
  - **Tests:** none (manual check).
  - **Check:**
    1. `schema.sql` holds the messages table and no `graphile_migrate` schema.
    2. `db:reset`, then `dev`: the first migrate applies one committed migration.
    3. Stop, then run `dev` again: "Already up to date".
    4. `node tools/repo-checks/src/main.ts` passes.
    5. `vp check`.
    6. After pushing, "Repo checks" and the gate are green.
- [ ] **5. Document what now runs, and set the migration pattern's exemplar**
  - **Goal:** the docs match the setup. Only docs change.
  - **Files:**
    - `docs/develop/local-development.md`: rewrite the status note. Postgres, `infra:up` and `infra:down`, and the example service's `dev`, `db:watch` and `db:reset` now run. The web frontend and the other services don't exist yet.
    - `docs/patterns/database-migration.md`:
      - rule 1: the configuration is a typed `gmrc.ts` loaded through a one-line `.gmrc.cjs`, because Graphile Migrate loads only `.gmrc`, `.gmrc.js` or `.gmrc.cjs`;
      - rule 2: the scripts run `graphile-migrate` directly, because `gmrc.ts` loads the env files itself, in the same order as `config.ts`. `db:reset` runs `graphile-migrate reset --erase`;
      - rule 4: the dump is a shadow-only command action, of `"$GM_DBNAME"`, with the reason;
      - Exemplar: `services/example/migrations/committed/000001.sql` and `services/example/gmrc.ts`.
    - `docs/adr/0031-load-configuration-only-in-each-services-config-module.md`: correct the consequence line about `dotenv run` in place. Tools such as Graphile Migrate load the same files in the same order from their own configuration (`gmrc.ts`), because `dotenv run -f` fails when the optional `.env` is missing.
    - `docs/develop/codebase.md`: an `infra/` row (local infrastructure files that Compose mounts; never imported), and `compose.yaml` at the root.
    - `services/example/README.md`: its scripts and that it needs `vp run infra:up` first, if the README lists how to run it.
  - **Read first:** the `writing-docs` skill. The `pattern` skill, for the exemplar and rule edits.
  - **Tests:** none.
  - **Check:** `vp check` (formats and checks Markdown).

**6. Acceptance criteria**, checked by hand on the maintainer's machine and on the pull request:

- [ ] `vp run infra:up` on a clean machine starts Postgres and returns once it is healthy. `vp run infra:down` stops it: proven by step 1's check on a fresh volume.
- [ ] Compose's Postgres image is pinned by tag and digest, at the current Postgres major: `postgres:19.0@sha256:766ddae…` in `compose.yaml`.
- [ ] On a fresh volume, the example service's role, database and shadow database exist, and the service connects as its own role: `\l` in step 1, and `migrate` running as `example` in step 2.
- [ ] `vp run --filter <example> dev` migrates, then starts the service. A second run finds nothing to migrate: step 4's checks 2 and 3.
- [ ] `db:watch` re-applies `current.sql` on save, and `db:reset` rebuilds the database from the committed migrations: step 3's check 1 and step 4's check 2.
- [ ] The committed migration creates the messages table with snake_case names, a plural table name, an `id uuid` primary key with no default, and `created_at` defaulting to `now()`: `migrations/committed/000001.sql`.
- [ ] `schema.sql` is regenerated by running migrations, through `pg_dump` inside the container, and is committed: step 4, through the shadow-only `afterAllMigrations` action.
- [ ] `current.sql` holds only comments at the end of the ticket: `node tools/repo-checks/src/main.ts` passes, and "Repo checks" is green on the pull request.
- [ ] The local development guide's status note is updated for what now runs: step 5.
- [ ] The database migrations pattern's exemplar names the example service's first migration and `.gmrc` (now `gmrc.ts`, see Notes): step 5.
- [ ] The `current.sql` repo check is shown failing once on the pull request (ticket 03's deferred criterion): the run linked in Notes from step 3.

## Notes

- **For ticket 06:** the test harness migrates its template database with Graphile Migrate. The `pg_dump` action is shadow-only, so it doesn't run there, as long as the harness migrates as the main database, not with `shadow`.
- 2026-11-23: Docker commands are denied to Claude even outside the sandbox, so the maintainer runs every `docker` and `vp run infra:*` check with `!`. Give them one command per line, and use double quotes (a single-quoted `'\l'` lost its closing quote when pasted). `vp check` must run outside the sandbox, because the sandbox's placeholder dotfiles break formatting.
- 2026-11-23: Step 1 also set `name: arcturus` in `compose.yaml`, so worktrees share one Compose project and volume. The volume is mounted at `/var/lib/postgresql`, as the Postgres 18+ images expect.
- 2026-11-23: **Plan change (step 2):** the Graphile Migrate scripts don't use `dotenv run`. dotenv's CLI stops the command when a file named with `-f` is missing (documented in dotenv 18's README), so `-f .env,.env.development` broke for anyone without the optional `.env`. Instead, a typed `gmrc.ts` loads both files with `config()`, and `.gmrc.cjs` requires it: Graphile Migrate loads only `.gmrc`, `.gmrc.js` or `.gmrc.cjs`, and Node 26 can `require()` a `.ts` module. The maintainer chose this, and to correct ADR 0031's consequence line in place in step 5. A hand-run `vp exec graphile-migrate commit` in step 4 needs no prefix.
- 2026-11-24: Step 3 also fixed `tools/repo-checks`: `findMigrationPackages` looked only for `.gmrc`, so after step 2's `.gmrc.cjs` the `current.sql` check silently skipped the example service. It now detects `.gmrc`, `.gmrc.js` and `.gmrc.cjs`, with a test, and the README says so.
- 2026-11-24: `db:watch` compares `current.sql` with its comments stripped, so a comment-only edit is skipped as "unchanged". To show it re-applying, change the SQL itself.
- 2026-11-24: Ticket 03's deferred criterion is shown: on PR #31, "Repo checks" failed on the non-blank `current.sql`, and the quality gate failed with it: https://github.com/rdmeal/arcturus/actions/runs/45294541709/job/138111484652?pr=31
