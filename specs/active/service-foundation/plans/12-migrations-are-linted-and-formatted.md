---
type: plan
---

# Plan 12: Migrations are linted and formatted

Implements [ticket 12](../tickets/12-migrations-are-linted-and-formatted.md), part of [the spec](../spec.md).

## Context

- **Test boundary:** CI and the maintainer's machine, from the spec's Testing section (the guard rails). There are no Vitest tests: the lint and format failures are each shown once on a deliberate violation in the pull request, then reverted.
- **ADRs:**
  - [0051: Lint and format migrations with Postgres Language Server](../../../../docs/adr/0051-lint-and-format-migrations-with-postgres-language-server.md): CI lints and format-checks only the committed migrations that differ from `origin/main`; locally `current.sql` is checked too; `db:commit` formats `current.sql` first; no type checking against a database.
  - [0052: Run only formatters in git hooks](../../../../docs/adr/0052-run-only-formatters-in-git-hooks.md): the hook formats a staged `current.sql`, never fails, never lints, and never touches a committed migration.
  - [0013: Migrate databases with Graphile Migrate](../../../../docs/adr/0013-migrate-databases-with-graphile-migrate.md): nothing may rewrite a committed migration, or the hash chain breaks.
  - [0045: Gate pull requests on one quality-gate job](../../../../docs/adr/0045-gate-pull-requests-on-one-quality-gate-job.md): the new job goes in the gate's `needs`; the ruleset doesn't change.
  - [0020: Guard the dependency supply chain](../../../../docs/adr/0020-guard-the-dependency-supply-chain.md): checked during planning (below).
- **Patterns:** [database-migration](../../../../docs/patterns/database-migration.md): gains the rules in the ticket's Notes (step 4). No other pattern applies.
- **Planning decisions:**
  - **Postgres Language Server passes ADR 0020, so Squawk isn't needed.** Checked on 2026-11-26 against `@postgres-language-server/cli@0.28.2`: published a month ago from GitHub Actions with SLSA provenance, no install scripts (only `test`), no dependencies. Its binaries come from seven platform `optionalDependencies` pinned to the same version (`@postgres-language-server/cli-x86_64-linux-gnu` and others); `vp install` applies the release-age and trust checks to them too. This settles the ticket's first acceptance criterion.
  - **Two root scripts, used locally and in CI alike.** `lint:sql` runs `check` and then `format` without `--write` (the format check), each over every `services/*/migrations/current.sql` and over the committed migrations changed since `origin/main` (`--changed --since=origin/main`), all with `--disable-db`. `fmt:sql` runs `format --write` over every `services/*/migrations/current.sql`. CI runs `vp run lint:sql` too: its `current.sql` files hold only comments, so including them costs nothing, and there is one command to keep in step.
  - **The config limits the tool to migration folders.** `files.include` is `services/*/migrations/**/*.sql`, which already leaves out each `schema.sql` (at the package root) and the test harness's fixtures (`packages/test-database/test/fixtures/migrations/`). An explicit ignore for `**/schema.sql` is added as well, as the ticket asks.
  - **`db:commit` calls the tool directly:** `postgres-language-server format --write migrations/current.sql && graphile-migrate commit`, so `-m "<message>"` still reaches `commit`. If the root devDependency's bin isn't on the PATH of a workspace package's script, or the tool doesn't find the root config from `services/example`, fall back to `vp run -w fmt:sql && graphile-migrate commit` (which formats every service's `current.sql`, harmless), and record it in Notes.
  - **The pre-commit hook gets a second `staged` entry** for `services/*/migrations/current.sql`, wrapped in `sh -c '… "$@" || true' sh` like the existing one, so it never fails. Committed migrations never match it.
  - **The CI job is `sql` ("SQL"),** checking out with `fetch-depth: 0` (so `origin/main` and the merge base exist), then `setup-vp` and `vp run lint:sql`.
  - **The deliberate violations use a real `db:commit`,** run by the maintainer, so the same run proves Graphile Migrate's header passes the format check. A hand-written `000002` file was rejected: it would also break the hash chain in the tests.
- **Risks to check in the steps that meet them:**
  - Graphile Migrate adds its `--! Previous / Hash / Message` header after formatting. A freshly committed migration must still pass the format check (step 3).
  - `check --changed` or `format --changed` may exit non-zero when no file changed (for example on a push to `main`). `lint:sql` must pass then (step 1); look for an option such as `--no-errors-on-unmatched`, or guard the call in the script.
  - Whether `--changed` includes files not yet committed to Git, locally. If it doesn't, the guide says to run `lint:sql` after the Git commit (step 4).

## Steps

- [x] **1. Add Postgres Language Server, its config and the root scripts**
  - **Goal:** `vp run lint:sql` and `vp run fmt:sql` work on the current tree without a database, and nothing outside the services' migration folders is ever checked. The build stays green.
  - **Files:**
    - `package.json`: devDependency `@postgres-language-server/cli` at `0.28.2` (added with `vp install`, which records it in `pnpm-lock.yaml`); scripts `lint:sql` and `fmt:sql`, beside `lint:workflows`, as in Planning decisions.
    - `postgres-language-server.jsonc` (new, repository root): `files.include` and the `schema.sql` ignore; `vcs` enabled with Git, `useIgnoreFile` and `defaultBranch` `origin/main`; the linter's recommended rules, with `preferRobustStmts` on and `requireLockTimeout` and `requireStatementTimeout` off, each with a one-line comment giving the reason (ticket Notes); the formatter with lowercase keywords, types and constants, a 2-space indent, and the line width of the code formatter (oxfmt's, as `vite.config.ts` sets or defaults it). Check the exact option and rule names against the tool's docs with context7 (`/supabase-community/postgres-language-server`); don't guess them.
  - **Read first:** [ADR 0051](../../../../docs/adr/0051-lint-and-format-migrations-with-postgres-language-server.md); the ticket's Notes ("Settled when this was discussed"); the tool's configuration, linting, formatting and VCS docs through context7.
  - **Tests:** none (tooling).
  - **Check:** `vp install`, then `vp run lint:sql` and `vp run fmt:sql` both exit 0 with nothing changed since `origin/main`. `vp run lint:sql` reports neither `000001-create-the-messages-table.sql` nor the fixture migration, nor any `schema.sql`. Temporarily put a `create table t (id int);` in `services/example/migrations/current.sql`: `lint:sql` fails on `preferRobustStmts`; uppercase a keyword and `fmt:sql` lowercases it. Restore `current.sql` to comments only. Then `vp check`.

- [x] **2. Run the SQL check in CI behind the quality gate**
  - **Goal:** every pull request and push to `main` runs `vp run lint:sql` in its own job, and the gate fails when it fails.
  - **Files:** `.github/workflows/quality-check.yml`: a `sql` job named "SQL", shaped like `workflow-lint` but with `fetch-depth: 0` on the checkout and a comment saying why (the job compares against `origin/main`); `sql` added to `quality-gate`'s `needs`.
  - **Read first:** [ADR 0045](../../../../docs/adr/0045-gate-pull-requests-on-one-quality-gate-job.md).
  - **Tests:** none (proven on the pull request in step 5).
  - **Check:** `vp run lint:workflows`.

- [x] **3. Format `current.sql` on `db:commit` and in the pre-commit hook**
  - **Goal:** every committed migration is formatted before Graphile Migrate hashes it, and a staged `current.sql` is formatted on commit, without the hook ever failing or touching a committed migration.
  - **Files:**
    - `services/example/package.json`: `db:commit` becomes `vp run -w fmt:sql && graphile-migrate commit` (the fallback in Planning decisions; see Notes).
    - `vite.config.ts`: a second `staged` entry, `"services/*/migrations/current.sql": "sh -c 'postgres-language-server format --write --disable-db \"$@\" || true' sh"` (drop `--disable-db` if `format` doesn't take it), and the comment above `staged` updated to say both entries only format.
  - **Read first:** [ADR 0052](../../../../docs/adr/0052-run-only-formatters-in-git-hooks.md); [database-migration](../../../../docs/patterns/database-migration.md) rules 2, 14 and 15.
  - **Tests:** none (manual, below).
  - **Check:**
    - With an unformatted change in `current.sql`, `git add` it and commit: the committed `current.sql` is formatted. Stage a file that fails to parse: the commit still succeeds. Stage only a committed migration with a whitespace change: it isn't rewritten. Undo these commits.
    - The maintainer runs `vp run --filter @arcturus/example-service db:commit -m "<message>"` on a robust, formatted throwaway migration (Postgres must be up), then `vp run lint:sql` passes on the new file, header included. Then `db:uncommit` and restore `current.sql`.
    - `vp check`.

- [x] **4. Fail SQL lint on warnings, and document the SQL check**
  - **Goal:** a lint warning fails `lint:sql` like an error, and the guides, the tech stack and the migration pattern describe the SQL check, so a contributor finds it where they'd look.
  - **Files:**
    - `package.json`: both `check` calls in `lint:sql` gain `--error-on-warnings` (see Notes, 2026-11-26 decision).
    - `docs/develop/commands.md`: `vp run lint:sql` (checks each service's `current.sql` and the committed migrations that differ from `main`, without a database) and `vp run fmt:sql` (formats `current.sql`).
    - `docs/develop/linting.md`: the opening line no longer implies Oxlint is the only lint; a new section on SQL migrations: the tool and its config file, the rule set and its two exceptions with reasons, that only migrations a pull request adds are checked and why, the CI job, and that SQL in Slonik templates isn't linted.
    - `docs/develop/tech-stack.md`: a row for migration lint and format with Postgres Language Server, linking [0051](../../../../docs/adr/0051-lint-and-format-migrations-with-postgres-language-server.md).
    - `docs/patterns/database-migration.md`: the additions in the ticket's Notes, without changing what existing rules mean: `db:commit` formats `current.sql` (rule 2); `preferRobustStmts` enforces rule 11's idempotency; run `vp run lint:sql` before committing a migration, and CI checks the migrations a pull request adds (Committing); a failure in an added migration is fixed with `db:uncommit`, fix, `db:commit`; optionally point the editor extension at the development database for live type errors in `current.sql`. Add ADR 0051 under Related. Also, as decided on 2026-11-26 (see Notes), and so changing rule 11: the undo section is only for what can be recreated only by dropping it (tables, types…), and is wrapped in a `pgls-ignore-start <rule>: <reason>` … `pgls-ignore-end <rule>` block naming each rule its drops trigger (`banDropTable` for a table); a statement that can be idempotent on its own (`add column if not exists`, `create index if not exists`, `create or replace function`) uses that form and has no undo. The exemplar line says `000001` predates the SQL check, so it has neither the block nor `if not exists`.
  - **Read first:** the `writing-docs` skill; [database-migration](../../../../docs/patterns/database-migration.md); the `pattern` skill (for editing a pattern doc).
  - **Tests:** none.
  - **Check:** `vp check`.

**5. Acceptance criteria**, checked at the test boundary (the pull request, and the maintainer's machine):

- [x] Postgres Language Server passes the checks of ADR 0020, including install scripts: proven during planning (Planning decisions), and by `vp install` in step 1.
- [x] A pull request adding a committed migration that breaks a lint rule fails the SQL job and the quality gate: shown once by a commit adding a `db:commit`ted migration with a `create table` without `if not exists` (and its undo `drop` inside a suppression block, so only that rule fires), then reverted. Record the run's URL in Notes.
- [ ] A pull request adding an unformatted committed migration fails the SQL job's format check: shown once by a commit (no `--no-verify` needed: the hook never formats a committed migration) with an uppercase keyword in a robust committed migration, then reverted. Record the run's URL in Notes.
- [x] Migrations already on `main`, every `schema.sql` and the test harness's fixture migrations are never checked or formatted: proven by step 1's check and by the config's `files.include` and ignore.
- [x] Locally, `vp run lint:sql` checks each service's `current.sql` and the committed migrations that differ from `main`, and `vp run fmt:sql` formats `current.sql`, neither needing a database: proven by step 1's check.
- [x] A service's `db:commit` formats `current.sql` before committing it: proven by step 3's `db:commit` check.
- [x] The pre-commit hook formats a staged `current.sql`, never a committed migration, and doesn't lint: proven by step 3's hook checks.
- [x] The commands guide and the linting guide describe the SQL commands and the CI job, the tech stack lists the tool with its ADR, and the database-migration pattern gains the rules in the ticket's Notes: step 4.

## Notes

- 2026-11-26: In 0.28.2 the lock-timeout rule is `lockTimeoutWarning` (there's no `requireLockTimeout`); it's the one turned off. `requireStatementTimeout` keeps its name.
- 2026-11-26: `check` doesn't check formatting, so `lint:sql` runs `check` and then `format` (no `--write`), each once over `services/*/migrations/current.sql` and once with `--changed --no-errors-on-unmatched`. `--changed` with a path intersects rather than unions, so the two calls can't be merged. The `--since` flag isn't needed: `vcs.defaultBranch` is `origin/main`.
- 2026-11-26: `vp run` doesn't expand globs, so both root scripts are wrapped in `sh -c '…'`. The pre-commit entry needs the same wrapper anyway.
- 2026-11-26: `--changed` sees only changes in Git commits since `origin/main`: an untracked or staged migration isn't checked. Proven in a scratch clone: a committed `000099` was caught, while edits to `schema.sql` and the fixture migration weren't checked. So, locally, run `lint:sql` after the Git commit that adds a migration (step 4 documents this).
- 2026-11-26: `000001-create-the-messages-table.sql`'s content, header included, passes the format check. Run as `current.sql`, it fails `preferRobustStmts` (`create table` without `if not exists` after the undo `drop`) and warns `banDropTable` on the undo section. Warnings don't fail the tool, because `--error-on-warnings` isn't passed.
- 2026-11-26 (plan change, agreed with the maintainer): **lint warnings fail `lint:sql`** (`--error-on-warnings`), because warnings that don't fail get ignored. Rules that misfire are suppressed where they're allowed, not turned off. The undo section's drops trigger `banDropTable` (table) or `banDropColumn` plus `multipleAlterTable` and `runningStatementWhileHoldingAccessExclusive` (column), so: the undo section is wrapped in `-- pgls-ignore-start <rule>: <reason>` … `-- pgls-ignore-end <rule>` (block suppressions work in 0.28.2; group specifiers such as `lint/safety` don't, so each rule is named); and an added column uses `add column if not exists` with no undo drop, which triggers nothing. Rule 11 of the database-migration pattern changes to match (step 4). Turning `banDropTable` off was rejected: it's exactly the check for a real drop that breaks the running service.
- 2026-11-26: With warnings failing, these pass `lint:sql`: a new table (undo block plus `create table if not exists`) with an index on it, an added column on its own, and an index on an existing table. `runningStatementWhileHoldingAccessExclusive` fires only when a statement follows one that locks an existing table (for example adding a column and then indexing it in one migration). It stays on: the fix is two migrations.
- 2026-11-26: `db:commit` uses the fallback, `vp run -w fmt:sql && graphile-migrate commit`. The root bin is on a service script's PATH, but run from `services/example` the tool's `files.include` (`services/*/migrations/**`) matches nothing, so formatting `migrations/current.sql` directly is a silent no-op. lint-staged passes absolute paths, which do match, so the hook entry calls the tool directly.
- 2026-11-26: Lint failure shown on PR #34: the SQL job failed on `preferRobustStmts` in `000002-lint-demo.sql`, at the `--changed` check (https://github.com/rdmeal/arcturus/actions/runs/45903033924/job/140193120510?pr=34).
