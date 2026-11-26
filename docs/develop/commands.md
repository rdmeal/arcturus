---
type: guide
---

# Commands

Run these from the repository root:

- `vp install`: install dependencies, with the pnpm version pinned in `package.json`.
- `vp check`: format check, lint and type check, all in one. Lint warnings fail it too.
- `vp fmt`: fix formatting. Markdown, JSON and YAML are formatted as well as code, so run it after editing docs.
- `vp test`: run every test. `vp test <path>` runs one test file. It needs Docker running, with the Compose plugin, because every run starts the tests' own Postgres container; the local stack doesn't need to be up.
- `vp run -r build`: build every package that has a `build` script.
- `vp run lint:workflows`: lint the GitHub Actions workflows with actionlint, as CI does. It runs actionlint's Docker image, so Docker must be running.
- `vp run lint:sql`: lint and format-check each service's `migrations/current.sql` and the committed migrations that differ from `origin/main`, as CI does. It needs no database. A migration counts as differing only once it's in a Git commit (see [Linting](./linting.md#sql-migrations)).
- `vp run fmt:sql`: format each service's `migrations/current.sql`. `db:commit` runs it for you.

`pnpm run check`, `pnpm run test` and `pnpm run build` do the same as `vp check`, `vp test` and `vp run -r build`.
