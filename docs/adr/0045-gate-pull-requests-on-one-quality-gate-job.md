---
type: adr
status: accepted
date: 2026-11-23
summary: The quality-check workflow runs its checks as parallel jobs that end in one always-run quality-gate job, which passes only if every job succeeded and is the only quality check the main ruleset requires, so jobs can be added, split or sharded without touching the ruleset.
tags: [tooling, ci]
---

# Gate pull requests on one quality-gate job after parallel checks

## Context

[Compose CI from reusable workflows](./0019-compose-ci-from-reusable-workflows.md) puts the checks in one reusable quality-check workflow, which the pull-request and main workflows both call. Until now that workflow has been a single job, running `vp check`, `vp test`, the build and actionlint one after another.

[Squash-merge pull requests into a protected main](./0025-squash-merge-pull-requests-into-a-protected-main.md) has a no-bypass ruleset on `main` that requires the quality check and the pull request title check to pass. A ruleset names required checks by job, so whatever jobs the workflow has, the ruleset must list.

The service foundation adds more checks:

- tests sharded across a matrix, with a job that merges their reports;
- repo checks from `tools/`, such as failing CI when a `migrations/current.sql` isn't blank.

Running each check as its own job lets them run in parallel. But requiring each one in the ruleset means editing the ruleset whenever a job is added, renamed or split, or the shard count changes. GitHub also treats a required job that was skipped as passing, so a mistake in a job's conditions can let a pull request through unchecked.

## Decision

We will run the quality-check workflow's checks as separate, parallel jobs, and end it with one `quality-gate` job:

- `quality-gate` `needs` every other job in the workflow and runs with `if: always()`.
- It passes only if every job it needs finished with `success`. A job that failed, was cancelled or was skipped fails the gate.
- The `main` ruleset requires `quality-gate`, reported as "Quality check / Quality gate", in place of the individual checks. The pull request title check stays a separate workflow and a separate required check, as it also runs when a title is edited.

The gate lives in the reusable workflow, so pushes to `main` end in the same gate.

## Consequences

- Jobs can be added, split, renamed or sharded by editing only the workflow. The ruleset doesn't change.
- A skipped or cancelled check fails the pull request, rather than being counted as passed.
- The checks run in parallel, so a run finishes when its slowest job does.
- Every job checks out and installs on its own. With `setup-vp`'s cache this costs about 20–30 seconds per job (November 2026), paid in parallel.
- Each new job must be added to the gate's `needs`, or it runs without blocking anything. Reviewing a workflow change means checking that list.
- A failed run shows the gate as failed, so finding the cause means opening the job that failed.

## Alternatives considered

- **Requiring every job in the ruleset:** every new job or change of shard count is a ruleset edit, and a skipped required job counts as passing.
- **Requiring only the test-report merge job:** it covers tests, but nothing else, and it has the same skipped-job problem.
- **Keeping one job with many steps:** nothing runs in parallel, and the run takes as long as every step added together.
