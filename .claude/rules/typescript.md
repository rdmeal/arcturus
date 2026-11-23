---
paths:
  - "**/*.ts"
  - "**/*.tsx"
---

# TypeScript

- Write erasable TypeScript only: no enums, namespaces or constructor parameter properties. Services and libraries run from `.ts` source with Node's type stripping. See `docs/adr/0018-run-typescript-source-directly.md`.
- ESM only. Import local files with their `.ts` extension.
- Validate every boundary (HTTP, callbacks, job payloads, database rows) with zod, and infer types from the schemas. See `docs/adr/0010-use-zod-as-the-only-schema-library.md`.
- Before writing a kind of code, check `docs/patterns/` as `CLAUDE.md` says.
- Every lint disable comment states its reason: see `docs/develop/linting.md`.

## Comments

- Comment only what the code can't say: why it does something surprising, a constraint that isn't visible here, or a warning of what breaks if it's changed.
- Never restate what the code does, or narrate a function step by step. Rename or extract instead.
- Never refer to plans, tickets, steps or future work ("added in step 2", "ticket 09 adds…", "will check the database once…"). Those belong in the plan or ticket. A comment describes the code as it is.
- Don't repeat an ADR or pattern. If a choice would look wrong without its reason, link the ADR in one line.
- Write a doc comment only on an export whose name and types don't already say what it does.
- No commented-out code and no closing-brace comments.
