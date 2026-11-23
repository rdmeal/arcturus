---
type: ticket
status: done
blocked-by: ["01"]
scopes: [arcturus]
---

# 02: Lint enforces the testing and production-code boundaries

Part of [the spec](../spec.md); delivers user stories 21 and 22.

## What to build

`vp check` stops a contributor when they break the rules the testing patterns depend on:

- production code that imports test code or test libraries;
- a test hook (`beforeAll`, `beforeEach`, `afterEach`, `afterAll`) in a test file;
- a snapshot assertion;
- an import of a service's direct-database escape hatch without a disable comment saying why;
- any lint disable comment without a reason, or one that no longer disables anything.

Each failure message points the contributor at the pattern that explains the rule.

## Acceptance criteria

- [ ] A non-test file that imports a test file, anything under a `test/` folder, a `*.handlers` module, `@arcturus/service-testing`, `msw`, `fishery` or `@testcontainers/*` fails `vp check`. Relative imports match with or without the `.ts` extension.
- [ ] A test file that imports a service's `direct-db` module fails `vp check`, with a message pointing to the service API test pattern.
- [ ] A test hook in a `*.test.ts` file fails `vp check`.
- [ ] `toMatchSnapshot`, `toMatchInlineSnapshot` and the snapshot forms of `toThrowError…` fail `vp check`, if Oxlint supports banning matchers natively. Otherwise this is recorded as not enforced, with the reason.
- [ ] A disable comment with no `-- <reason>` fails `vp check`, and so does a disable comment that no longer suppresses anything.
- [ ] Each rule above was shown to fail once on a deliberate violation, which was then reverted.
- [ ] The repo-wide rule that every disable comment states its reason has a home in the contributor docs, and the TypeScript rule for Claude points to it in one line.

## Notes

- **Settled when planning:** whether `require-description` from `@eslint-community/eslint-plugin-eslint-comments`, run through Oxlint's JS plugins, sees `oxlint-disable` directives. If it doesn't, write a small check in `tools/` that every directive ends with `-- <reason>`, run from the repo-checks job (ticket 03) and the pre-commit hook.
- **Any new lint plugin passes the supply-chain checks:** see [Guard the dependency supply chain](../../../../docs/adr/0020-guard-the-dependency-supply-chain.md).
- **Decisions and patterns:**
  - [Build, test, lint and format with Vite+](../../../../docs/adr/0017-build-test-lint-and-format-with-vite-plus.md)
  - [service API tests](../../../../docs/patterns/service-api-test.md), rules 3, 6, 12 and 13
