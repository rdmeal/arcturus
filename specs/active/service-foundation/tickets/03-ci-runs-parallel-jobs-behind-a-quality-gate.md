---
type: ticket
status: done
blocked-by: ["01"]
scopes: [arcturus]
---

# 03: CI runs parallel jobs behind one quality gate

Part of [the spec](../spec.md); delivers user stories 23 and 24.

## What to build

A pull request's checks run as parallel jobs, and one quality gate at the end decides whether it passes, as [Gate pull requests on one quality-gate job after parallel checks](../../../../docs/adr/0045-gate-pull-requests-on-one-quality-gate-job.md) decides. The jobs are:

- `check`;
- the tests, split into 2 shards, with one job merging their reports into a single result;
- `build`;
- workflow lint;
- repo checks, which run the scripts in `tools/`.

The first repo check fails CI when any service's `migrations/current.sql` holds anything but comments. Pushes to `main` run the same workflow and end in the same gate.

## Acceptance criteria

- [ ] A pull request shows the parallel jobs and a final quality gate, and the gate passes when every job passes.
- [ ] The gate fails when any job it needs fails, is cancelled or is skipped. Failure was shown once with a deliberately failing job.
- [ ] Tests run in 2 shards writing blob reports, and a merge job combines them. The shard count is set in one place.
- [ ] A `current.sql` with anything other than comments fails the repo-checks job. This was shown once with a temporary file, then reverted. A repo with no services, or with blank `current.sql` files, passes.
- [ ] Pushes to `main` run the same jobs and gate.
- [ ] The maintainer has switched the `main` ruleset to require "Quality check / Quality gate" and the pull request title check, in place of the old quality check.

## Notes

- **Settled when planning:** how the gate tests its needed jobs' results (anything other than `success` fails), and whether the merge job runs only when every shard produced a report.
- **The ruleset is changed by the maintainer** on GitHub. Claude can't change it, or push.
- **Actions stay pinned by commit SHA:** see [Guard the dependency supply chain](../../../../docs/adr/0020-guard-the-dependency-supply-chain.md).
- **Decisions and patterns:**
  - [Compose CI from reusable workflows](../../../../docs/adr/0019-compose-ci-from-reusable-workflows.md)
  - [Squash-merge pull requests into a protected main](../../../../docs/adr/0025-squash-merge-pull-requests-into-a-protected-main.md)
  - [database migrations](../../../../docs/patterns/database-migration.md), the rule that `current.sql` is blank at merge
