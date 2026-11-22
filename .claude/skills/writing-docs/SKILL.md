---
name: writing-docs
description: How documentation is organised and written in this repo — which audience folder or scope a doc goes in, the one-home-per-fact rule, frontmatter types, what README.md, docs/ARCHITECTURE.md and CLAUDE.md may hold, path-scoped rules, house style, and keeping docs current. Use this whenever writing or editing any doc, README, CLAUDE.md or .claude/rules file in this repo, or when a change alters something documented — including when another skill (to-adr, to-pattern, finish-ticket, grill-me-with-docs) writes or updates docs.
user-invocable: false
---

# Writing docs

The conventions live in `docs/develop/writing-docs.md`. Read it and follow it; this skill adds only what Claude needs on top. ADRs and patterns also follow the `adr` and `pattern` skills.

## Before writing

1. **Find the fact's home.** Search for where the fact is already documented (`grep -rn` across `docs/`, `README.md`, `CLAUDE.md`, `.claude/rules/` and the scopes' `docs/`). If it has a home, change it there. Link to it from anywhere else, and don't copy it.
2. **Pick the place** for anything new from the table in `writing-docs.md`. A guide for one audience goes in that audience's folder, in the narrowest scope that owns it.
3. **Name the reader** by glossary role: contributor, operator, author or user. If you can't, the doc probably mixes audiences and should be split.

## CLAUDE.md and rules

- **Root `CLAUDE.md`** loads into every session and most subagents. Add to it only what every session needs before touching any file: a new kind of doc for the map, or a rule that applies everywhere. Anything else goes in a contributor doc, a rule or a skill.
- **A rule** in `.claude/rules/` has a `paths:` list of globs, and loads only once Claude reads or edits a matching file. So a rule can arrive one write late on the first file in a new folder: guidance that must come earlier belongs in `CLAUDE.md`. A rule states a short constraint and links its home (an ADR or a pattern). It never paraphrases a pattern.
- **A skill** holds a procedure. It links the contributor docs it follows rather than restating them.

See `docs/adr/0029-load-claude-context-in-layers.md` for why.

## Before finishing

- Each fact you touched has one home, and every other mention is a link or a one-line summary with a link.
- New docs have the right `type` frontmatter (none on package READMEs).
- Links are relative and resolve.
- The README's "where to go next" table links any audience folder that gained its first doc.
- `docs/develop/tech-stack.md` matches any technology decision that changed, and `docs/ARCHITECTURE.md` any change to the components or how they talk.
- `CLAUDE.md`'s map lists any new kind of doc, and nothing else in `CLAUDE.md` changed without a reason from the list above.
