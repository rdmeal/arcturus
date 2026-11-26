---
type: ticket
status: in-progress
blocked-by: []
scopes: [arcturus]
---

# 11: Git hooks only format

Part of [the spec](../spec.md); delivers user story 27.

## What to build

A contributor can always commit and push, whatever state their work is in. The pre-commit hook still formats the staged files, but it no longer runs lint, type or other checks, so it never refuses a commit. Those checks keep running in the editor and in CI, where every pull request must pass the quality gate. The contributor guides say the hook only formats.

## Acceptance criteria

- [ ] A commit whose staged files have a deliberate lint error and a type error succeeds, and its files are committed formatted. Shown once, not committed.
- [ ] The hook configuration has a comment linking [Run only formatters in git hooks](../../../../docs/adr/0052-run-only-formatters-in-git-hooks.md), so nobody adds a check back without seeing why.
- [ ] The pull requests guide, the linting guide and getting started say the pre-commit hook only formats, and that lint and type checks run in the editor and CI.

## Notes

- [Run only formatters in git hooks](../../../../docs/adr/0052-run-only-formatters-in-git-hooks.md) is the decision and its reasons.
- [Prefer established lint plugins over local rules](../../../../docs/adr/0046-prefer-established-lint-plugins-over-local-rules.md) says lint runs in the hook. It's on `main`, so it isn't edited; ADR 0052 already says that statement no longer holds.
- Ticket 12 adds a formatter for migrations to the same hook configuration.
