---
type: guide
---

# Pull requests

Every change reaches `main` through a pull request that passes CI, and is squash-merged, so a pull request's title becomes its one commit on `main`.

- **Title:** write it as a [Conventional Commit](https://www.conventionalcommits.org/en/v1.0.0/): `type(scope): subject`, lower case, no full stop, such as `feat(gateway): retry failed deliveries`. CI checks it with commitlint.
- **Types:** commitlint's `config-conventional` defaults: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`. A scope is optional and free-form.
- **Breaking changes:** mark them with `!` in the title, such as `feat(game-protocol)!: …`.
- **Branch commits and branch names** aren't checked. Write commits however you like, but keep them readable.
- **Pre-commit hook:** runs `vp staged`, which only formats the staged files and never refuses a commit, so you can always commit and push unfinished work. Lint and type checks run in your editor and in CI, whose quality gate every pull request must pass. Turn the hook off in your clone with `vp hooks disable`.

The reasons are in [Squash-merge pull requests into a protected main](../adr/0025-squash-merge-pull-requests-into-a-protected-main.md) , [Write pull request titles as Conventional Commits](../adr/0026-write-pull-request-titles-as-conventional-commits.md) and [Run only formatters in git hooks](../adr/0052-run-only-formatters-in-git-hooks.md).
