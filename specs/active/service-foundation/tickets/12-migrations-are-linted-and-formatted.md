---
type: ticket
status: ready
blocked-by: ["11"]
scopes: [arcturus]
---

# 12: Migrations are linted and formatted

Part of [the spec](../spec.md); delivers user story 28.

## What to build

A pull request that adds a migration which is unsafe, isn't idempotent or isn't formatted fails a new SQL check in CI, and with it the quality gate, while the migration can still be fixed. Migrations already on `main` are never checked. A contributor can run the same check, and the formatter, locally. Committing a migration with the service's `db:commit` script formats it first, and the pre-commit hook formats a staged `current.sql`, so a migration is formatted before Graphile Migrate hashes it. The database-migration pattern says how to work with all of this.

## Acceptance criteria

- [ ] Postgres Language Server passes the checks of [Guard the dependency supply chain](../../../../docs/adr/0020-guard-the-dependency-supply-chain.md), including whether its npm package runs install scripts. If it doesn't, Squawk replaces it for linting only, as [Lint and format migrations with Postgres Language Server](../../../../docs/adr/0051-lint-and-format-migrations-with-postgres-language-server.md) says, and the formatting criteria below wait for a later ticket.
- [ ] A pull request adding a committed migration that breaks a lint rule (for example a `create table` without `if not exists`) fails the SQL job and the quality gate. Shown once on a deliberate violation.
- [ ] A pull request adding an unformatted committed migration fails the SQL job's format check. Shown once.
- [ ] Migrations already on `main`, every `schema.sql` and the test harness's fixture migrations are never checked or formatted.
- [ ] Locally, one command checks each service's `current.sql` and the committed migrations that differ from `main`, and another formats `current.sql`. Neither needs a database.
- [ ] A service's `db:commit` formats `current.sql` before committing it, so the committed migration is formatted.
- [ ] The pre-commit hook formats a staged `current.sql`, never a committed migration, and doesn't lint.
- [ ] The commands guide and the linting guide describe the SQL commands and the CI job, the tech stack lists the tool with its ADR, and the database-migration pattern gains the rules listed in Notes.

## Notes

- **Decisions:** [Lint and format migrations with Postgres Language Server](../../../../docs/adr/0051-lint-and-format-migrations-with-postgres-language-server.md) and [Run only formatters in git hooks](../../../../docs/adr/0052-run-only-formatters-in-git-hooks.md). Also [Migrate databases with Graphile Migrate](../../../../docs/adr/0013-migrate-databases-with-graphile-migrate.md) and [Gate pull requests on one quality-gate job after parallel checks](../../../../docs/adr/0045-gate-pull-requests-on-one-quality-gate-job.md): the SQL job sits behind the gate, so the ruleset doesn't change.
- **Settled when this was discussed:**
  - **Files:** CI checks the committed migrations that differ from `origin/main` (the tool's `--changed --since` options), so its job needs the full Git history. Locally, `current.sql` is checked too.
  - **Rules:** the tool's recommended set, with `prefer-robust-stmts` on (it enforces the pattern's idempotent `current.sql`) and `require-lock-timeout` and `require-statement-timeout` off, because Graphile Migrate runs migrations before the service starts.
  - **No type checking against a database,** in CI or locally (`--disable-db`): the tests already run every committed migration against the pinned Postgres.
  - **Style:** lowercase keywords, types and constants; 2-space indent; the code formatter's line width.
  - **Configuration:** one config file at the repository root, limited to the services' migration folders and excluding `schema.sql`; the two scripts at the root beside the workflow lint; the tool a root devDependency.
  - **Out of scope:** SQL inside TypeScript, in Slonik's `sql` templates.
- **The database-migration pattern gains,** on this ticket's branch (its existing rules don't change meaning):
  - `db:commit` formats `current.sql` before committing it;
  - run the SQL check before committing a migration; CI checks the migrations a pull request adds;
  - a failure in an added migration is fixed with `db:uncommit`, fix, `db:commit`;
  - `prefer-robust-stmts` enforces the idempotency rule;
  - optionally, point the editor extension at the development database for live type errors in `current.sql`.
- **Pitfall:** a formatter must never rewrite a committed migration: it would break Graphile Migrate's hash chain.
