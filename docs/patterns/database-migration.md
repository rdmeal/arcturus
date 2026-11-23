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

1. `.gmrc` sits at the service package's root. Migrations live in `migrations/`: `current.sql` holds the migration being written, and `committed/` holds finished migrations.
2. The service's `package.json` has these scripts, each running the Graphile Migrate command-line tool through `dotenv run -q -f .env,.env.development --`, so it reads the same env files, in the same order, as the service (see [Service composition root](./service-composition-root.md)):
   - `dev` runs `graphile-migrate migrate` before starting the service, so the database is always up to date with the committed migrations;
   - `db:watch` runs `graphile-migrate watch`, which re-applies `current.sql` on every save;
   - `db:reset` runs `graphile-migrate reset`, which drops the development database and rebuilds it from the committed migrations.
3. `DATABASE_URL`, `SHADOW_DATABASE_URL` and `ROOT_DATABASE_URL` are in the service's `.env.development`. The service connects as its own role. The root URL is the local superuser, which Graphile Migrate uses only to recreate the shadow database and on `db:reset`.
4. `.gmrc`'s `afterAllMigrations` writes `schema.sql` at the package root with `pg_dump --schema-only`, run inside the Postgres container (`docker compose exec -T postgres pg_dump …`), so the host needs no Postgres tools.

### Naming

5. Names are `snake_case`, and table names are plural (`tournaments`, `match_players`).
6. Every table has an `id uuid primary key` with no default: the ID is generated in code (see [Vertical slices](./vertical-slice.md)).
7. A table that records when a row was written has `created_at timestamptz not null default now()`.
8. A foreign key column is named after the singular of the table it refers to, with `_id` (`tournament_id`).
9. Tables go in the `public` schema. Each service has its own database, and graphile-worker and Graphile Migrate keep to their own schemas.
10. Columns keep their `snake_case` names in the schema. Queries alias them to camelCase (see [Vertical slices](./vertical-slice.md)).

### Writing a migration

11. Write the change in `current.sql` with `db:watch` running. `current.sql` runs again on every save, so it must be safe to run repeatedly: start with an undo section that drops what the migration creates (`drop … if exists … cascade`), followed by the change itself. Where a statement can be idempotent on its own (`create or replace function`), use that form.
12. Never edit a committed migration: the hash chain detects it. Any change to the schema, including fixing a mistake in a committed migration, is a new migration.
13. Migrations hold structure, and only the data the schema needs, such as lookup rows. Never put seed or test data in a migration.

### Committing

14. Commit the migration with `graphile-migrate commit -m "<what it does>"` as the last step before the pull request is ready, so it takes the next number in the chain as late as possible.
15. If `main` gains a migration before the pull request merges, run `graphile-migrate uncommit`, rebase onto `main`, and commit again, so the chain stays a single line.
16. Commit the regenerated `schema.sql` with the migration, so reviewers see the schema change as a diff.
17. `current.sql` must hold only comments when the pull request merges. CI fails if any service's `migrations/current.sql` contains anything else.

## Exemplar

None yet: established by the first ticket that uses it.

## Related

- [Migrate databases with Graphile Migrate](../adr/0013-migrate-databases-with-graphile-migrate.md)
- [Load configuration only in each service's config module](../adr/0031-load-configuration-only-in-each-services-config-module.md)
- [Service composition root](./service-composition-root.md): where the env files come from.
- [Database transactions](./database-transaction.md): how services use the schema at runtime.
