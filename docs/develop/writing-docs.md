---
type: guide
---

# Writing docs

How the documentation in this repository is organised and written. The reasons are in [Give every documented fact one home](../adr/0027-give-every-documented-fact-one-home.md), [Organise guides by audience, with shared reference](../adr/0028-organise-guides-by-audience.md) and [Load Claude's project context in layers](../adr/0029-load-claude-context-in-layers.md).

## One home per fact

Every fact lives in exactly one doc. Anywhere else, link to it, or give at most a one-line summary next to the link. Never restate rules, steps or reasoning. Before writing something down, search for where it already lives.

## Where a doc goes

| What it is                                            | Where it goes                                          |
| ----------------------------------------------------- | ------------------------------------------------------ |
| A guide for **contributors** (working on this repo)   | `docs/develop/`                                        |
| A guide for **operators** (deploying and configuring) | `docs/operate/`                                        |
| A guide for **authors** (games and players elsewhere) | `docs/extend/`                                         |
| A guide for **users**                                 | `docs/use/`                                            |
| A term                                                | `GLOSSARY.md` of the narrowest scope that uses it      |
| How the parts fit together now                        | `docs/ARCHITECTURE.md`                                 |
| A decision and its reasons                            | an ADR in the owning scope's `docs/adr/`               |
| How a kind of code is written                         | a pattern in `docs/patterns/` (or a scope's, rarely)   |
| How to use a Claude skill                             | `docs/skills/`                                         |
| Something only one scope needs (a game's rules, say)  | that scope's own `docs/`, in the same audience folders |
| What a package is and how to run and test it          | the package's `README.md`                              |

The roles are defined in the [glossary](../GLOSSARY.md), and the scopes in the [context map](../CONTEXT-MAP.md). Create an audience folder when its first doc is written. Arcturus-wide guides link down to scope docs rather than repeating them.

## What the top-level files hold

- **`README.md`:** the pitch, the status, a "where to go next" table with one row per audience, and the licence. When you add an audience's first doc, link it from that table.
- **`docs/ARCHITECTURE.md`:** the current picture: components, interactions, the technology table with a link to each ADR, and a short note on the shape of a service that links the patterns. No list of ADRs and no rules.
- **`CLAUDE.md`:** only what every Claude session needs: a map of the docs saying when to read each, the commands (imported from [commands.md](./commands.md)), and a few rules that apply everywhere. It changes only when a new kind of doc appears.
- **`.claude/rules/`:** guidance for particular files, loaded when Claude touches them. A rule states a short constraint and links the ADR or pattern that owns it.

## Frontmatter

Docs start with a `type`:

- `guide`: a doc in an audience folder;
- `index`: the README, and any landing page for an audience or folder;
- `adr`, `pattern`, `glossary`, `context-map`, `skill-guide`: as their own conventions describe.

Package READMEs have no frontmatter, because npm and GitHub show it as clutter.

## Style

- Plain British English.
- The glossary's terms, and the scope's glossary's terms inside a scope.
- Short sentences. Put the reader's task first, and skip marketing language.
- One H1 per file, matching what the doc is about.
- Relative links between docs, so they work on GitHub and in a docs site later.
- Markdown is formatted by `vp fmt`, like the code.

## Keeping docs current

When a change alters a documented fact, update that fact's home in the same pull request: the technology table in `docs/ARCHITECTURE.md`, a guide in `docs/develop/`, a scope's docs, or a package README. Don't add a copy anywhere else.
