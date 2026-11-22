---
type: guide
---

# Working with Claude Code

This repository is set up for working with [Claude Code](https://code.claude.com). This page covers the setup you need to do yourself. For the workflow commands you can run, see [Claude skills](../skills/README.md).

## Format hook

A project hook formats every file Claude writes or edits, with `vp fmt`. It needs [`jq`](https://jqlang.org/download/) on your path.

## Context7

[Context7](https://context7.com/docs) gives Claude current documentation for the libraries this repo uses, rather than relying on its training data. It's recommended, not required: without it, Claude falls back on what it already knows and web search, which is less reliable for recent releases.

To set it up:

1. Create a Context7 account. The [free plan](https://context7.com/plans-pricing) is enough.
2. Run `/mcp` in Claude Code, approve the project's `context7` server and sign in.

Claude's lookup queries are sent to Context7's service.

Claude looks up docs automatically when a question or task involves a library's API. To force a lookup, say "use context7 to look up …" and name the library, and the version if it matters.

Finding a library (`resolve-library-id`) runs without asking, but **each docs fetch (`query-docs`) asks for your approval**. Check that the library ID is the one you mean, the right project and version. If it isn't, deny the fetch and tell Claude which library to use: docs for the wrong library mislead Claude for the rest of the session.

## How Claude finds its context

Claude reads the same docs you do. `CLAUDE.md` holds only a map of the docs, the commands and a few repo-wide rules; guidance for particular kinds of file is in `.claude/rules/`, and procedures are in skills. See [Load Claude's project context in layers](../adr/0029-load-claude-context-in-layers.md).
