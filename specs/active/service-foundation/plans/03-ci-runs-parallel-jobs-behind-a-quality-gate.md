---
type: plan
---

# Plan 03: CI runs parallel jobs behind one quality gate

Implements [ticket 03](../tickets/03-ci-runs-parallel-jobs-behind-a-quality-gate.md), part of [the spec](../spec.md).

## Context

- **Test boundary:** CI itself, from the spec's "guard rails". A pull request shows the parallel jobs, the merged test report and the quality gate, and the gate is shown to fail once on a deliberate failure. The repo check's package discovery also has Vitest unit tests, because it is code and not configuration.
- **ADRs:**
  - [0045: Gate pull requests on one quality-gate job after parallel checks](../../../../docs/adr/0045-gate-pull-requests-on-one-quality-gate-job.md): `quality-gate` `needs` every other job, runs with `if: always()`, and passes only if every needed result is `success`. Every new job goes in its `needs`.
  - [0019: Compose CI from reusable workflows](../../../../docs/adr/0019-compose-ci-from-reusable-workflows.md): every job lives in `quality-check.yml`. `pull-request.yml` and `main.yml` don't change, so pushes to `main` get the same jobs and gate.
  - [0020: Guard the dependency supply chain](../../../../docs/adr/0020-guard-the-dependency-supply-chain.md): new actions (`actions/upload-artifact`, `actions/download-artifact`) are pinned to a full commit SHA with the version in a comment, at a release at least a week old.
  - [0025: Squash-merge pull requests into a protected main](../../../../docs/adr/0025-squash-merge-pull-requests-into-a-protected-main.md): the maintainer, not Claude, switches the `main` ruleset to require "Quality check / Quality gate".
  - [0013: Migrate databases with Graphile Migrate](../../../../docs/adr/0013-migrate-databases-with-graphile-migrate.md): the repo check uses Graphile Migrate's own `status` command.
- **Patterns:** [database migration](../../../../docs/patterns/database-migration.md) rule 17 (`current.sql` holds only comments at merge) is the rule the repo check enforces. No coding pattern applies to the workflow or the tool.
- **Planning decisions:**
  - **The `current.sql` check is Graphile Migrate's built-in one,** `graphile-migrate status --skipDatabase`, which exits with bit 2 set when the current migration holds anything other than comments. Writing our own comment stripping was rejected because it duplicates Graphile's logic and could disagree with it.
  - **`status` still validates settings,** so the tool passes placeholder `DATABASE_URL` and `SHADOW_DATABASE_URL` values (different database names, since Graphile rejects equal connection strings). `--skipDatabase` means they are never connected to.
  - **A migration package is one with a `.gmrc`,** under `services/*` or `games/*/service`. With none, the check passes. Today there are none.
  - **The failure demo moves to ticket 05.** Graphile Migrate arrives in ticket 05, so this ticket can only show that a repo with no migration packages passes. Ticket 05's pull request shows the repo-checks job failing on a non-blank `current.sql`.
  - **The repo check lives in `tools/repo-checks`,** with `src/main.ts` running every check. CI runs it with `node tools/repo-checks/src/main.ts`, relying on type stripping.
  - **The gate is inline, with no third-party action:** `toJSON(needs)` goes through an env var to `jq -e 'all(.[]; .result == "success")'`. Any other result (`failure`, `cancelled`, `skipped`) fails it.
  - **The shard count is set in one place,** the matrix list `shard: [1, 2]`. The total comes from `strategy.job-total`.
  - **Shards upload their blobs with `if: ${{ !cancelled() }}`,** and the merge job runs with the same condition, so failing tests still produce one merged report. The merge job fails if it gets fewer blob files than shards.
  - **`vp test` forwards options to Vitest** (confirmed in the Vite+ docs): `--shard`, `--reporter=blob` and `--mergeReports [path]`. The blob folder's default must be checked locally, because Vitest and Vite+ examples disagree (`.vitest-reports/` vs `.vitest/blob/`).
  - **Job ids and names:** `check: Check`, `test: Test (shard N)`, `test-report: Test report`, `build: Build`, `workflow-lint: Workflow lint`, `repo-checks: Repo checks`, `quality-gate: Quality gate`.

## Steps

- [ ] **1. Repo check: every migration package's `current.sql` holds only comments**
  - **Goal:** a `tools/repo-checks` package whose `main.ts` exits non-zero, naming the package, when any migration package's `graphile-migrate status --skipDatabase` fails, and passes when there are no migration packages. CI doesn't change yet, and the build stays green.
  - **Files:**
    - `tools/repo-checks/package.json` (`@arcturus/repo-checks`, private, `type: module`; `@types/node` as a dev dependency, the same version as `tools/lint-rules`).
    - `tools/repo-checks/tsconfig.json` (the same as `tools/lint-rules`).
    - `tools/repo-checks/src/migration-packages.ts`: `findMigrationPackages(root: string): Promise<string[]>` returns the folders under `services/*` and `games/*/service` that contain a `.gmrc`, sorted, relative to `root`.
    - `tools/repo-checks/src/current-migration.ts`: `checkCurrentMigrations(root: string): Promise<string[]>` runs `vp exec graphile-migrate status --skipDatabase` in each package with the placeholder env, and returns a failure message for each package that exits non-zero. Name the placeholder URLs as constants.
    - `tools/repo-checks/src/main.ts`: runs every check from the repo root, prints each failure, and sets `process.exitCode = 1` if there are any. Lint bans `process.exit`.
    - `tools/repo-checks/README.md`: what the checks are, how to run one locally, and that each new check is added to `main.ts`.
    - `pnpm-lock.yaml`, from `vp install`.
  - **Read first:** [database migration](../../../../docs/patterns/database-migration.md) rules 1 and 17, `tools/lint-rules/package.json` and `README.md` (the shape to follow), [Package READMEs](../../../../docs/develop/writing-docs.md#package-readmes) for the README.
  - **Tests:** in `tools/repo-checks/src/migration-packages.test.ts`, using a temporary folder cleaned up with `onTestFinished`:
    - `finds no packages when no service has a .gmrc`
    - `finds services and game services that have a .gmrc`
    - `ignores packages without a .gmrc`
  - **Check:** `vp test tools/repo-checks && vp check && node tools/repo-checks/src/main.ts`, the last of which passes with no migration packages.
- [ ] **2. Split quality-check into parallel jobs behind the quality gate**
  - **Goal:** `quality-check.yml` runs `check`, `test` (not sharded yet), `build`, `workflow-lint` and `repo-checks` as parallel jobs, each with its own checkout and `setup-vp` (`cache: true`), ending in `quality-gate`.
  - **Files:** `.github/workflows/quality-check.yml`:
    - one job per check, with the ids and names in Context;
    - `repo-checks` runs `node tools/repo-checks/src/main.ts`;
    - `quality-gate` `needs` every other job, has `if: always()`, and a step that gets `NEEDS: ${{ toJSON(needs) }}` through `env` and runs `jq -e 'all(.[]; .result == "success")' <<< "$NEEDS"`, after printing each job's result for the log;
    - a comment on `quality-gate`'s `needs` saying that every job must be listed there (ADR 0045).
  - **Read first:** [ADR 0045](../../../../docs/adr/0045-gate-pull-requests-on-one-quality-gate-job.md), [ADR 0020](../../../../docs/adr/0020-guard-the-dependency-supply-chain.md).
  - **Tests:** none in code. The workflow is proven by actionlint and on the pull request (step 5).
  - **Check:** `docker run --rm -v "$PWD:/repo" -w /repo rhysd/actionlint@sha256:b1934ee5f1c509618f2508e6eb47ee0d3520686341fec936f3b79331f9315667 -color`. If Docker isn't reachable from the session, the maintainer runs it, or it runs when the PR is opened.
- [ ] **3. Shard the tests and merge their reports**
  - **Goal:** tests run in 2 shards writing blob reports, and `test-report` merges them into one result. The shard count is set only in the matrix list.
  - **Files:**
    - `.github/workflows/quality-check.yml`:
      - `test` gets `strategy: { fail-fast: false, matrix: { shard: [1, 2] } }`, is named `Test (shard ${{ matrix.shard }})`, and runs `vp test --shard=${{ matrix.shard }}/${{ strategy.job-total }} --reporter=default --reporter=blob`.
      - `test` then uploads its blob folder as artifact `blob-report-${{ matrix.shard }}`, with `if: ${{ !cancelled() }}` and short retention (1 day).
      - A new `test-report` job `needs: test`, has `if: ${{ !cancelled() }}`, downloads `blob-report-*` with `merge-multiple: true` into the blob folder, fails if the folder holds fewer than one file per shard, then runs `vp test --mergeReports <folder>`.
      - `test-report` is added to `quality-gate`'s `needs`.
    - `.gitignore`: the blob folder.
  - **Read first:** [ADR 0020](../../../../docs/adr/0020-guard-the-dependency-supply-chain.md) (pin the new actions by SHA with a version comment, from releases at least a week old), Vitest's [sharding and merging reports guide](https://vitest.dev/guide/improving-performance#sharding).
  - **Tests:** none in code. Locally, `vp test --shard=1/2 --reporter=blob` and `--shard=2/2`, then `vp test --mergeReports`, to confirm the blob folder and that merging reports every test once.
  - **Check:** the local sharding run above, then actionlint as in step 2.
- [ ] **4. Hand the `current.sql` failure demo to ticket 05**
  - **Goal:** ticket 05's pull request shows the repo-checks job failing on a non-blank `current.sql`, since Graphile Migrate first arrives there.
  - **Files:** `specs/active/service-foundation/tickets/05-local-postgres-and-first-migration.md`: add one line to Notes saying that its pull request shows the repo-checks job failing once on a non-blank `current.sql` (as ticket 03's acceptance criteria describe), reverted afterwards, with a link to this plan.
  - **Read first:** none.
  - **Tests:** none.
  - **Check:** `vp check` (formatting).

**5. Acceptance criteria**, checked at the test boundary (CI and GitHub):

- [ ] A pull request shows the parallel jobs and a final quality gate, and the gate passes when every job passes: proven by this ticket's pull request run, with every job and "Quality check / Quality gate" green.
- [ ] The gate fails when any job it needs fails, is cancelled or is skipped. Failure was shown once with a deliberately failing job: proven by a temporary commit on the pull request that makes one job fail (for example `exit 1` in `build`), with the gate red, then reverted.
- [ ] Tests run in 2 shards writing blob reports, and a merge job combines them. The shard count is set in one place: proven by the "Test (shard 1)", "Test (shard 2)" and "Test report" jobs on the pull request, with the merged output listing every test file, and by `shard: [1, 2]` being the only place the count appears.
- [ ] A `current.sql` with anything other than comments fails the repo-checks job. A repo with no services, or with blank `current.sql` files, passes: the "no migration packages passes" half is proven by the "Repo checks" job on this pull request. The failure demo is deferred to ticket 05 (step 4), because Graphile Migrate isn't installed until then.
- [ ] Pushes to `main` run the same jobs and gate: proven by the Main workflow run after the squash-merge.
- [ ] The maintainer has switched the `main` ruleset to require "Quality check / Quality gate" and the pull request title check, in place of the old quality check: done by the maintainer on GitHub, once the gate has reported on the pull request, so GitHub offers it as a check.

## Notes
