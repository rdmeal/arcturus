---
type: adr
status: accepted
date: 2026-11-22
summary: Root CLAUDE.md holds only what every session needs (docs map, commands imported from the contributor docs, repo-wide rules), file-specific guidance lives in path-scoped rules that link to their homes, and procedures live in skills, so subagents don't load what they don't need and Claude's guidance never becomes a second copy of the docs.
tags: [docs, tooling]
---

# Load Claude's project context in layers

## Context

Arcturus is built largely with Claude Code, and Claude needs much of what contributors need: the stack, the conventions, the commands, the rules for commits. The easy route is to put all of it in `CLAUDE.md`. By November 2026 that had started: `CLAUDE.md` restated the technology choices and the commit and pull request rules, which already lived in the ADRs and the README.

Claude Code offers several ways to give Claude context, which load differently (per the Claude Code memory and subagent docs, November 2026):

- the root `CLAUDE.md` loads into every session and into most subagents (the built-in Explore and Plan agents skip it);
- `@path` imports in `CLAUDE.md` are loaded eagerly with it, so they save no context;
- `CLAUDE.md` files in subdirectories load only when Claude touches a file in that directory;
- rules in `.claude/rules/` with a `paths:` frontmatter load only when Claude reads or edits a matching file;
- skills load only when invoked or judged relevant.

The docs recommend keeping `CLAUDE.md` under 200 lines, moving guidance for parts of the codebase into path-scoped rules, and moving procedures into skills. Separately, [Give every documented fact one home](./0027-give-every-documented-fact-one-home.md) means Claude's guidance can't be a second copy of the contributor docs.

## Decision

We will layer Claude's context:

- **Root `CLAUDE.md`** holds only what every session, subagents included, needs and can't cheaply find: what Arcturus is and its status, a map of where the docs live and when to read each, the commands, and a few rules that apply everywhere (use the glossary's terms; grep the patterns' summaries before writing a kind of code; ignore `scratchpad/`). It doesn't summarise the stack or restate commit rules; it points to the docs that own them.
- **The commands' home is `docs/develop/commands.md`**, which `CLAUDE.md` imports with `@docs/develop/commands.md`, because both contributors and every Claude session need them.
- **Guidance for some files only** goes in path-scoped rules in `.claude/rules/`. A rule states a short constraint and links to the ADR or pattern that owns it, without paraphrasing it. We start with a TypeScript rule and a docs rule, and add others only when a need appears.
- **Procedures** live in skills, which link to the contributor docs they follow rather than restating them. A `docs` reference skill holds the documentation conventions, whose human-facing home is `docs/develop/writing-docs.md`.
- There are no `CLAUDE.md` files in subdirectories.

## Consequences

- Every session and subagent starts with a small, stable `CLAUDE.md`, and most guidance reaches Claude only when it is working on files it applies to.
- Rules load once a matching file is touched, so a rule can arrive one write too late when Claude creates the first file in a new folder. Guidance that must come before any file is touched, such as checking the patterns, stays in `CLAUDE.md`. The TypeScript rule arriving late costs little, because `vp check` catches non-erasable syntax.
- Claude reads the same contributor docs that people do, so improving those docs improves Claude's work, and the two can't disagree.
- Claude-only files are kept in `.claude/`, where they are easy to audit, rather than scattered across packages.
- Custom subagents may later want `omitClaudeMd`; that is decided when the first one is written.
- Each session's changes go to the home of each changed fact, not into `CLAUDE.md`, which changes only when a new kind of doc appears.

## Alternatives considered

- **Everything in `CLAUDE.md`:** simple, but it becomes a copy of the docs that drifts, and every subagent pays for content it doesn't need.
- **A `CLAUDE.md` in each package:** Claude Code's own on-demand mechanism, but it scatters Claude-only files across the repository and makes them harder to keep consistent.
- **Pointers only, with no rules:** relies on Claude remembering to look up the right doc every time it edits a kind of file.
