# @arcturus/repo-checks

Checks on the repository as a whole, run by the "Repo checks" job in CI (see [Gate pull requests on one quality-gate job after parallel checks](../../docs/adr/0045-gate-pull-requests-on-one-quality-gate-job.md)).

## Checks

- **`checkCurrentMigrations(root: string): Promise<string[]>`:** fails each service whose `migrations/current.sql` holds more than comments, the rule in [database migration](../../docs/patterns/database-migration.md). It runs `graphile-migrate status --skipDatabase` in every service with a Graphile Migrate configuration file (`.gmrc`, `.gmrc.js` or `.gmrc.cjs`), found with `findMigrationPackages` from [`@arcturus/workspace`](../../packages/workspace/README.md), and returns one message per failing service.

`src/main.ts` runs every check and exits non-zero if any fails. A new check is a function from the repository root to its failure messages, added to the `checks` list in `main.ts`.

## Running

From the repository root, after `vp install`:

- `node tools/repo-checks/src/main.ts` runs every check.
- `vp test tools/repo-checks` runs the tests.
