---
type: adr
status: accepted
date: 2026-11-22
summary: Pull request titles, which become the squash commits on main, follow Conventional Commits and are checked by commitlint in the pull-request workflow, so release tooling can read main's history, while branch commits stay unchecked.
tags: [tooling, ci]
---

# Write pull request titles as Conventional Commits, checked in CI

## Context

Pull requests are squash-merged, so each one becomes a single commit on `main` whose subject is the pull request's title (see [Squash-merge pull requests into a protected main](./0025-squash-merge-pull-requests-into-a-protected-main.md)). Branch commits never reach `main`.

Releases (versioning, changelogs, publishing the protocol packages) are not decided yet, but the commit format has to suit whichever tool is chosen. release-please and semantic-release work out versions and changelogs from commit messages in the Conventional Commits format. Changesets ignores commit messages altogether. The ticket skills already give pull requests Conventional Commit titles, and every commit on `main` since the restart follows the format, but nothing checks it.

Vite+ has commit hooks built in, but no commit message linting (as of version 1.6, November 2026). The usual tool for that is commitlint, often run from a `commit-msg` hook.

## Decision

We will write pull request titles in the [Conventional Commits 1.0](https://www.conventionalcommits.org/en/v1.0.0/) format, and check them in CI:

- a step in the pull-request workflow runs commitlint, with `@commitlint/config-conventional`, on the pull request title. The title is passed in through an environment variable, never interpolated into the script. The workflow also runs when a pull request is edited, so fixing the title re-runs the check;
- the commitlint config lives at the repository root, so it can also be run by hand;
- the types are `config-conventional`'s defaults: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore` and `revert`;
- a scope is optional and free-form;
- a breaking change is marked with `!` in the title (`feat(game-protocol)!: …`). A `BREAKING CHANGE:` footer in the description is an optional extra;
- branch commits are not checked, and there is no `commit-msg` hook.

## Consequences

- Every commit on `main` is in a format release-please and semantic-release can read, and Changesets is still an option.
- Committing on a branch costs nothing extra; a wrong title is caught once the pull request is opened, and fixing it on GitHub re-runs the check.
- Only the title is checked. The description becomes the squash commit's body unchecked, so a `BREAKING CHANGE:` footer there can be malformed or missing. That is why `!` in the title is the required marker.
- Free scopes can be inconsistent (`gateway` and `player-gateway`). Monorepo release tools tell which package changed from file paths or changeset files, not scopes, so this doesn't affect releases. The release decision can tighten scopes if its tool needs them.
- commitlint and its config are dev dependencies at the root, subject to [Guard the dependency supply chain](./0020-guard-the-dependency-supply-chain.md).
- If a dependency update bot is adopted later, its pull request titles must be configured as Conventional Commits, or the check will fail them.
- What counts as a breaking change, for example against the protocols' versions, is left to the release and protocol decisions.

## Alternatives considered

- **A `commit-msg` hook checking every commit:** the usual commitlint setup, but it checks commits that squash merging throws away, adds friction to every commit, and misses a title written or edited on GitHub.
- **`amannn/action-semantic-pull-request`:** a common action for exactly this, but it is another third-party action to pin and trust, and its rules live apart from a commitlint config that can be run locally.
- **Free-form messages:** nothing a release tool can read.
- **Gitmoji or similar conventions:** less common, with fewer tools that support them.
- **A restricted scope list (`scope-enum`) or required scopes:** a list needs updating with every new service, game and agent, and a change across the repo has no single scope.
