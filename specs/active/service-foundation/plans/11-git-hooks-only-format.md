---
type: plan
---

# Plan 11: Git hooks only format

Implements [ticket 11](../tickets/11-git-hooks-only-format.md), part of [the spec](../spec.md).

## Context

- **Test boundary:** CI and the maintainer's machine, from the spec's Testing section. The commit check is manual, shown once and not committed.
- **ADRs:** [0052: Run only formatters in git hooks](../../../../docs/adr/0052-run-only-formatters-in-git-hooks.md): the pre-commit hook formats the staged files and never fails on a lint, type or other check. [0046: Prefer established lint plugins over local rules](../../../../docs/adr/0046-prefer-established-lint-plugins-over-local-rules.md) says lint runs in the hook. It isn't edited, because ADR 0052 already says that no longer holds.
- **Patterns:** none apply. This is hook configuration and docs.
- **Planning decisions:**
  - **The hook runs `vp fmt --no-error-on-unmatched-pattern` on the staged files.** The flag has to be written out: `vp check --fix` implied it, but `vp fmt` doesn't. Without it, a commit whose staged files oxfmt ignores (for example only `.sh` or `.sql` files) would fail.
  - **The hook never refuses a commit, even when a staged file can't be parsed.** oxfmt exits non-zero on a file it can't parse, and that would refuse the commit. The file is committed unformatted instead, which is safe because `vp check` in CI flags unformatted files.
  - **The exit code is swallowed with a shell wrapper,** because `vp staged` passes its config to a bundled lint-staged, which runs a command without a shell, so `|| true` can't go in the command string. The entry is `sh -c 'vp fmt --no-error-on-unmatched-pattern "$@" || true' sh`: lint-staged appends the staged paths, so they arrive as `"$@"`. If that doesn't work as expected (quoting, or lint-staged rejecting the form), switch to a lint-staged function task, and record the switch in Notes.
  - **The hook script `.vite-hooks/pre-commit` is unchanged.** It still runs `vp staged`.
  - **The config change and the doc updates are one commit,** so the docs never describe a hook the repo doesn't have.

## Steps

- [x] **1. Make the pre-commit hook only format, and say so in the guides**
  - **Goal:** the hook formats the staged files and always exits successfully, the hook config links ADR 0052, and the contributor guides describe the new behaviour. `vp check` stays green.
  - **Files:**
    - `vite.config.ts`: the `staged` entry `"*"` becomes the `sh -c` wrapper from Planning decisions. Replace the comment above `staged:` with one that says the hook only formats and never fails, links `docs/adr/0052-run-only-formatters-in-git-hooks.md`, and says not to add lint, type or other checks here.
    - `docs/develop/getting-started.md` (line 25): the hook formats the files you commit. Lint and type checks run in your editor and in CI.
    - `docs/develop/pull-requests.md` (line 13): the hook runs `vp staged`, which only formats the staged files and never refuses a commit. Lint and type checks run in the editor and in CI's quality gate.
    - `docs/develop/linting.md` (line 7): lint runs in CI and in your editor. Drop "in the pre-commit hook", and link ADR 0052 where it fits.
  - **Read first:** [ADR 0052](../../../../docs/adr/0052-run-only-formatters-in-git-hooks.md). Load the `writing-docs` skill before editing the guides.
  - **Tests:** none committed. Before committing, try the wrapper by hand. Stage a formatted `.ts` file, an unformatted `.ts` file, a file oxfmt ignores (a `.sh`) and a `.ts` file that doesn't parse, run `vp staged`, and check it exits 0 and formats the unformatted file. Unstage and delete them afterwards.
  - **Check:** `vp check`

**2. Acceptance criteria**, checked at the test boundary:

- [x] A commit whose staged files have a deliberate lint error and a type error succeeds, and its files are committed formatted. Shown once, not committed: on a throwaway branch, commit an unformatted `.ts` file with a lint error (for example `eval("x")`) and a type error. Check that the commit succeeds and that `git show` has the file formatted. Then delete the branch.
- [x] The hook configuration has a comment linking [Run only formatters in git hooks](../../../../docs/adr/0052-run-only-formatters-in-git-hooks.md), so nobody adds a check back without seeing why: proven by the comment above `staged:` in `vite.config.ts`.
- [x] The pull requests guide, the linting guide and getting started say the pre-commit hook only formats, and that lint and type checks run in the editor and CI: proven by `docs/develop/pull-requests.md`, `docs/develop/linting.md` and `docs/develop/getting-started.md`.

## Notes
