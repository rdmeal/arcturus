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
