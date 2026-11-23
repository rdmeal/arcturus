---
type: adr
status: accepted
date: 2026-11-23
summary: When lint needs a rule Oxlint lacks, use an established plugin through Oxlint's JS plugins, past the supply-chain checks, and write a local rule in tools/lint-rules only when no maintained plugin covers the need or works with Oxlint.
tags: [tooling]
---

# Prefer established lint plugins, and write a local rule only when none fits

## Context

Lint is Oxlint, run by `vp check` (see [Build, test, lint and format with Vite+](./0017-build-test-lint-and-format-with-vite-plus.md)). Oxlint has fewer rules than ESLint. As of Oxlint 1.93 (November 2026), it can load ESLint-style JS plugins, either from npm or from a local path. So when a rule is missing, it can come from a published plugin or from our own code.

The testing guard rails needed one such rule: every lint disable comment must give a reason. ESLint's community plugin, `@eslint-community/eslint-plugin-eslint-comments`, has `require-description`. However, its directive parser looks for `eslint-` comments, so it is unlikely to see `oxlint-disable` comments. We judged it not worth testing. A rule of about twenty lines, loaded as a local JS plugin, was shown to see `oxlint-disable` comments.

[Guard the dependency supply chain](./0020-guard-the-dependency-supply-chain.md) sets the checks a dependency passes before it is added. It is not a reason to avoid one. The repository has one maintainer, so code we write is code we maintain.

## Decision

When lint needs a rule that Oxlint doesn't have, we will use an established plugin that provides it, loaded through Oxlint's JS plugins, once it passes the supply-chain checks.

We will write our own rule only when no maintained plugin covers the need, or when the plugin doesn't work with Oxlint. Our own rules live in `tools/lint-rules` (`@arcturus/lint-rules`), as an Oxlint JS plugin named `arcturus`. Each rule is TypeScript with unit tests, and is built with `definePlugin` and `defineRule` from `vite-plus/lint/plugins`.

`arcturus/disable-needs-reason` is the first local rule.

## Consequences

- We don't re-implement rules that other people already maintain and test.
- Each plugin we add needs a supply-chain review. It is also another version to keep working with Oxlint's JS plugin support, which is still young.
- Local rules are quick to write, need no new dependency, and run wherever `vp check` runs: the pre-commit hook, CI and the editor. But they are ours to maintain.
- Before writing a local rule, look for a plugin first, and say why none fits in the pull request.
- A local rule should be replaced when a maintained plugin that works with Oxlint appears.

## Alternatives considered

- **Always write our own rules:** keeps dependencies down, but re-implements and maintains work that already exists elsewhere.
- **A check script in `tools/`, outside lint:** wouldn't run in the editor, and would need its own wiring into CI and the pre-commit hook.
