---
type: adr
status: accepted
date: 2026-11-26
summary: The pre-commit hook only formats; lint, type and other checks run in the editor and CI, so a contributor can always commit and push work in progress as a backup, since pull requests are squash-merged and branch history isn't worth protecting.
tags: [tooling, ci]
---

# Run only formatters in git hooks

## Context

The repository's pre-commit hook runs `vp staged`, which runs `vp check --fix` on the staged files: formatting, lint and type checks. A commit with a lint or type error is refused until it's fixed. [Prefer established lint plugins over local rules](./0046-prefer-established-lint-plugins-over-local-rules.md) mentions that lint runs in the hook, and the contributor guides say so too.

A contributor's branch is also their backup: pushing it to GitHub is what keeps work safe if something happens to their machine. A hook that refuses broken work stops them committing and pushing exactly when the work is unfinished.

Checking at commit time protects nothing that matters. Every pull request runs the full checks in CI and must pass the quality gate before it can merge (see [Gate pull requests on one quality-gate job after parallel checks](./0045-gate-pull-requests-on-one-quality-gate-job.md)). Pull requests are squash-merged, so a branch's individual commits never reach `main` (see [Squash-merge pull requests into a protected main](./0025-squash-merge-pull-requests-into-a-protected-main.md)), and a broken commit on a branch costs nothing.

## Decision

We will run only formatters in git hooks. The pre-commit hook formats the staged files and never fails on a lint, type or other check. Those checks run in the editor and in CI.

## Consequences

- A contributor can always commit and push, whatever state the work is in, so pushing stays a reliable backup.
- Committed files are still formatted, so diffs don't fill with formatting changes.
- Lint and type errors show up in the editor and in CI rather than at commit time, so a pull request can go red on an error the hook used to catch.
- What [Prefer established lint plugins over local rules](./0046-prefer-established-lint-plugins-over-local-rules.md) says about lint running in the pre-commit hook no longer holds; lint still runs in the editor and CI.
- A formatter in the hook must never rewrite a file whose content is fixed once committed, such as a committed Graphile Migrate migration, whose hash would break.

## Alternatives considered

- **Lint and type checks in the hook, as before:** errors surface at commit time, but the hook blocks committing and pushing unfinished work, which is when a backup matters most.
