---
type: pattern
summary: Use when changing a service's database schema — write the change in an idempotent current.sql under db:watch, commit it with Graphile Migrate as the last step before the PR, and commit the regenerated schema.sql with it.
tags: [backend, database]
---

# Database migrations

Each service's schema is built by plain SQL migrations, managed with Graphile Migrate. The migration being written lives in `current.sql`, which is re-applied to the development database on every save, and is committed into a hash-chained, forward-only history once it's finished.

## When to use it

- Adding a database to a service.
- Any change to a service's schema: tables, columns, indexes, constraints, functions, or the rows the schema itself needs.

## When not to

- For games and players in other repositories, which choose their own migration tools.
- For graphile-worker's `graphile_worker` schema, which graphile-worker creates and migrates itself when it starts.

## Rules

### Layout and scripts

1. The configuration is a typed `gmrc.ts` at the service package's root (`satisfies Settings` from `graphile-migrate`), loaded by a one-line `.gmrc.cjs` beside it, because Graphile Migrate only loads `.gmrc`, `.gmrc.js` or `.gmrc.cjs`. Migrations live in `migrations/`: `current.sql` holds the migration being written, and `committed/` holds finished migrations. A new service with a database takes its scripts and configuration from the exemplar, and adds its role, database and shadow database to `infra/postgres/init/01-service-databases.sql`. The exemplar's `gmrc.ts` is the only copy so far: the next service to get a database moves what the two would share into one helper rather than copying it.
2. `gmrc.ts` loads `.env` and `.env.development` with dotenv, in the same order as the service's config module (see [Service composition root](./service-composition-root.md)), so the scripts run `graphile-migrate` directly. The service's `package.json` has these scripts:
   - `dev` runs `graphile-migrate migrate` before starting the service, so the database is always up to date with the committed migrations;
   - `db:watch` runs `graphile-migrate watch`, which re-applies `current.sql` on every save;
   - `db:reset` runs `graphile-migrate reset --erase`, which drops the development database and rebuilds it from the committed migrations;
   - `db:commit` runs `vp run -w fmt:sql && graphile-migrate commit`, so `current.sql` is formatted before Graphile Migrate hashes it. It runs the root script because the SQL tool's configuration names paths from the repository root. `db:uncommit` runs `graphile-migrate uncommit` (rules 14, 15 and 19).

   Only `dev` runs across services (`vp run dev`). Run the others for one service at a time, with `vp run --filter <package> <script>`: each service has its own chain, and a recursive `db:commit` would give every service the same message and fail on any service whose `current.sql` is blank.

3. `DATABASE_URL`, `SHADOW_DATABASE_URL` and `ROOT_DATABASE_URL` are in the service's `.env.development`. The service connects as its own role, which owns its database and shadow database. The root URL is the local superuser, which Graphile Migrate uses only to recreate the shadow database and on `db:reset`.
4. `afterAllMigrations` writes `schema.sql` at the package root with `pg_dump --schema-only`, run inside the Postgres container (`docker compose exec -T postgres pg_dump …`), so the host needs no Postgres tools. The action is shadow-only (`shadow: true`) and dumps `"$GM_DBNAME"`. The shadow database is rebuilt from the committed migrations alone, so the dump matches what is committed and never runs in tests, and the database name works whatever host port Postgres is on. A fixed `--restrict-key` keeps the dump the same while the schema is. To regenerate `schema.sql` without a new migration, run `graphile-migrate reset --shadow --erase`.

### Naming

5. Names are `snake_case`, and table names are plural (`tournaments`, `match_players`).
6. Every table has an `id uuid primary key` with no default: the ID is generated in code (see [Vertical slices](./vertical-slice.md)).
7. A table that records when a row was written has `created_at timestamptz not null default now()`.
8. A foreign key column is named after the singular of the table it refers to, with `_id` (`tournament_id`).
9. Tables go in the `public` schema. Each service has its own database, and graphile-worker and Graphile Migrate keep to their own schemas.
10. Columns keep their `snake_case` names in the schema. Queries alias them to camelCase (see [Vertical slices](./vertical-slice.md)).

### Writing a migration

11. Write the change in `current.sql` with `db:watch` running. `current.sql` runs again on every save, so it must be safe to run repeatedly, and the SQL check's `preferRobustStmts` rule fails any statement that isn't:
    - Write every statement in its idempotent form where it has one: `create table if not exists`, `alter table … add column if not exists`, `create index if not exists`, `create or replace function`.
    - Give what the migration creates and is still being reshaped, such as a new table or type, an undo section at the top that drops it (`drop … if exists … cascade`), so that each save rebuilds it. An added column needs no undo: `add column if not exists` is enough. If you rename one while writing, the old column stays in the development database until `db:reset`.
    - Wrap the undo section in `-- pgls-ignore-start <rule>: <reason>` and `-- pgls-ignore-end <rule>`, once for each rule its drops trigger (`banDropTable` for a table). The reason says the section drops only what this migration creates. Those rules still apply to everything below the undo section, where a drop really can break the running service.
    - For live type errors while you write, you can point the Postgres Language Server editor extension at your development database. The scripts and CI never connect to one.
12. Never edit a committed migration: the hash chain detects it. Any change to the schema, including fixing a mistake in a committed migration, is a new migration.
13. Migrations hold structure, and only the data the schema needs, such as lookup rows. Never put seed or test data in a migration.

### Committing

14. Commit the migration with `vp run --filter <package> db:commit -m "<what it does>"` as the last step before the pull request is ready, so it takes the next number in the chain as late as possible. The message also names the file (`000002-create-the-tournaments-table.sql`).
15. If `main` gains a migration for the same service before the pull request merges, run `db:uncommit`, rebase onto `main`, and commit again, so the chain stays a single line.
16. Commit the regenerated `schema.sql` with the migration, so reviewers see the schema change as a diff.
17. `current.sql` must hold only comments when the pull request merges. CI fails if any service's `migrations/current.sql` contains anything else.
18. Run `vp run lint:sql` before committing the migration: it lints and format-checks `current.sql` without a database. CI's SQL job checks the committed migrations a pull request adds, and fails the quality gate on a lint warning, a lint error or a formatting difference (see [Linting](../develop/linting.md#sql-migrations)).
19. To fix a failure in a migration the pull request adds, run `db:uncommit`, fix `current.sql`, and `db:commit` again. Never edit or format the committed file itself (rule 12).

## Exemplar

- `services/example/migrations/committed/000001-create-the-messages-table.sql`: a first migration, with its undo section and the naming rules. It predates the SQL check, so its undo section has no suppression block and its `create table` has no `if not exists` (rule 11). It can't be changed (rule 12).
- `services/example/gmrc.ts` and `.gmrc.cjs`: the env files loaded in the service's order, and the shadow-only `schema.sql` dump. The scripts are in `services/example/package.json`.

## Related

- [Migrate databases with Graphile Migrate](../adr/0013-migrate-databases-with-graphile-migrate.md)
- [Lint and format migrations with Postgres Language Server](../adr/0051-lint-and-format-migrations-with-postgres-language-server.md)
- [Load configuration only in each service's config module](../adr/0031-load-configuration-only-in-each-services-config-module.md)
- [Service composition root](./service-composition-root.md): where the env files come from.
- [Database transactions](./database-transaction.md): how services use the schema at runtime.
