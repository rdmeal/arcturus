---
type: adr
status: accepted
date: 2026-11-22
summary: Every change reaches main as one squashed commit from a pull request that has passed CI, enforced by a no-bypass ruleset, so main reads as one line per change and branch commits can stay messy.
tags: [tooling, ci]
---

# Squash-merge pull requests into a protected main

## Context

Arcturus has one maintainer, working mostly through tickets planned with Claude. The ticket workflow (`plan-ticket`, `implement`) deliberately makes one commit per plan step, so a branch carries many small, working-state commits whose messages matter only while the work is in progress. The history of `main` is what later readers, and release tooling (not yet chosen), will read.

GitHub offers three ways to merge a pull request: a merge commit, which keeps every branch commit plus a merge commit; rebase merging, which replays every branch commit onto `main`; and squash merging, which turns the whole pull request into one commit. Pull requests have been squash-merged since the restart, but only by habit: nothing stopped another merge method or a direct push to `main`.

CI runs only on pull requests and on `main` (see [Compose CI from reusable workflows](./0019-compose-ci-from-reusable-workflows.md)), so a direct push to `main` reaches it without any checks having run.

## Decision

We will merge pull requests into `main` by squashing only, and protect `main` so that this is the only way in:

- the repository allows squash merging only; merge commits and rebase merging are turned off;
- the squash commit takes the pull request's title as its subject and the pull request's description as its body;
- head branches are deleted automatically once merged;
- a GitHub ruleset on `main` requires a pull request (with no approvals, as there is one maintainer), requires the quality check and the pull request title check (see [Write pull request titles as Conventional Commits](./0026-write-pull-request-titles-as-conventional-commits.md)) to pass, blocks force pushes and deletion, and allows no bypass, not even for administrators.

These are repository settings, applied by hand in GitHub rather than kept in the repo.

## Consequences

- `main` reads as one commit per pull request, and every commit on it has passed CI.
- Branch commits can be as messy as the work needs. Their messages aren't checked and never reach `main`.
- The pull request title is the only message that reaches `main`, which is what the title check builds on.
- A large pull request's internal steps survive only on the pull request, not in `git log` on `main`.
- A branch made from another unmerged branch has to be rebased once its base is squashed, because the base's commits no longer exist on `main`.
- Even a one-line fix needs a pull request and a green CI run. In an emergency an administrator can still edit the ruleset.
- Signed commits aren't required: GitHub signs the squash commits it creates, so the rule would only ever check GitHub's own signature.
- Because the settings live in GitHub, not in the repo, a fork or a move to another host has to set them up again.

## Alternatives considered

- **Merge commits:** keep every branch commit on `main`, which makes the history noisy and makes every commit message matter.
- **Rebase merging:** gives a linear history with every commit kept, which only pays off if every branch commit is clean. The one-commit-per-step workflow doesn't aim for that.
- **A ruleset with administrator bypass:** allows direct pushes when convenient, which also means checks can be skipped by accident.
- **Branch protection rules:** GitHub's older mechanism; rulesets are the one GitHub recommends.
