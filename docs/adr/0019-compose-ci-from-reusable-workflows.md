---
type: adr
status: accepted
date: 2026-11-18
summary: A pull-request workflow and a main workflow both call one reusable quality-check workflow, so the checks are defined once and the two can diverge later.
tags: [tooling, ci]
---

# Compose CI from reusable workflows

## Context

CI runs on GitHub Actions. The old stack had two workflows: one for pushes to any branch except `main`, and one for `main`. Both ran Yarn and Nx and duplicated their steps.

Pull requests and `main` need the same checks today: install, then `vp check`, `vp test`, the build and actionlint (see [Build, test, lint and format with Vite+](./0017-build-test-lint-and-format-with-vite-plus.md)). They are expected to diverge later. For example, `main` may go on to build images or deploy. Caching, images, releases and deployment are not decided yet, and this ADR is the base those decisions build on.

## Decision

We will compose CI from reusable workflows:

- a reusable **quality-check** workflow (`workflow_call`) that installs dependencies and runs the checks, tests and build;
- a **pull-request** workflow, triggered by `pull_request` and runnable by hand (`workflow_dispatch`), that calls quality-check;
- a **main** workflow, triggered by pushes to `main`, that calls quality-check.

Steps that only one event needs go in that event's workflow. Steps both need go in a reusable workflow.

## Consequences

- The checks are defined in one place, so pull requests and `main` can't drift apart.
- The pull-request and main workflows can each gain their own steps without copying the checks.
- Branches don't get CI until a pull request is opened. That avoids double runs and wasted minutes on branches that never become pull requests, but early feedback on a branch means opening a pull request (a draft is enough) or running the workflow by hand.
- Reusable workflows add a little indirection: a run's steps are spread over two files.
- This decision is easy to reverse. It is recorded so that later CI decisions have a shape to build on.

## Alternatives considered

- **One workflow triggered by both events:** simpler today, but the steps for each event have to be told apart with conditions as they diverge.
- **Run on every branch push, as the old workflows did:** runs twice once a pull request is open, and spends minutes on branches that never become pull requests.
