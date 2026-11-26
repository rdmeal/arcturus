---
type: adr
status: accepted
date: 2026-11-26
summary: Migrations are linted for unsafe and common mistakes and formatted by Postgres Language Server, the one candidate that does both with Postgres's own parser, checking in CI the committed migrations a pull request adds, because merged migrations can't change.
tags: [tech-stack, database]
---

# Lint and format migrations with Postgres Language Server

## Context

Each service's schema is built by plain SQL migrations managed with Graphile Migrate (see [Migrate databases with Graphile Migrate](./0013-migrate-databases-with-graphile-migrate.md)). Nothing checks that SQL before it runs: Oxlint and the code formatter don't read `.sql` files, so a migration can take an unsafe lock, break the rule that `current.sql` is idempotent, or be laid out however its author likes.

Graphile Migrate shapes where any check can act:

- A migration is hashed into a chain when it's committed with `graphile-migrate commit`. Once that commit reaches `main`, the file can never change, not even to add a comment. Before then, a pull request can still undo it with `graphile-migrate uncommit`, fix it and commit it again.
- The repository's checks fail any pull request whose `current.sql` holds more than comments, so CI never sees a migration in `current.sql`: it sees the committed files a pull request adds.
- Every CI test run already executes every committed migration against the real, pinned Postgres, when the test harness builds its templates (see [Give every test a fresh database from a migrated template](./0035-give-every-test-a-fresh-database-from-a-template.md)).

Three tools were weighed, as of November 2026. Postgres Language Server, a Supabase-community project, has a CLI with `check` (syntax and lint rules, many of them ported from Squawk) and `format`, both of which can limit themselves to files changed since a Git ref (`--changed --since=<ref>`). It parses with Postgres's own parser and installs from npm. It can also type-check statements against a live database's schema, without running them.

## Decision

We will lint and format migrations with Postgres Language Server's CLI:

- CI lints and format-checks the committed migrations that differ from `origin/main`. Migrations already on `main` are never checked, and neither is `schema.sql`, which `pg_dump` generates.
- Locally, the same check also covers each service's `current.sql`.
- `db:commit` formats `current.sql` before Graphile Migrate commits it, so every committed migration is formatted when it's hashed.
- Type checking against a database is off in CI and in the scripts.

## Consequences

- Unsafe or non-idempotent migrations fail CI before they reach `main`, where they could no longer be fixed. The rule that `current.sql` is idempotent is enforced by lint (`prefer-robust-stmts`) rather than remembered.
- Migrations are formatted the same way everywhere, without anyone running a formatter by hand.
- A rule added or changed later never fails on old migrations, because only migrations a pull request adds are checked. The CI job needs the full Git history to find where the branch left `main`.
- Type checking is given up in CI. It would only catch what Postgres would reject, and the tests already run every committed migration against Postgres. A contributor can still point the editor extension at their development database for live type errors while writing `current.sql`.
- It adds a dependency, which must pass [Guard the dependency supply chain](./0020-guard-the-dependency-supply-chain.md) when it's added. If it doesn't, the fallback is Squawk for linting only, with formatting left for later.
- SQL written inside TypeScript, in Slonik's `sql` templates, isn't linted: no candidate reads SQL embedded in TypeScript, and the tests run those queries.

## Alternatives considered

- **Squawk:** the fullest set of migration-safety rules, but no formatter, so formatting would need a second tool.
- **SQLFluff:** a configurable linter and formatter, but written in Python, with its own SQL grammar that can lag behind Postgres, and rules about style rather than migration safety. In a TypeScript-only repository it would have to run from a Docker image.
- **Checking every committed migration:** simpler, but a rule added later that an old migration breaks could never be satisfied, because a merged migration can't change.
- **Type checking in CI against a migrated database:** a second migrated database beside the tests' templates, to catch a subset of what the tests already catch.
