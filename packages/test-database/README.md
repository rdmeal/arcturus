# @arcturus/test-database

The tests' Postgres: one container for each `vp test` run, and a database of its own for each test that needs one. `@arcturus/service-testing` builds its `db` fixture on it, and `service-runtime`'s own tests use it directly. It is only ever a dev dependency. Why tests work this way is in [Run test databases in Testcontainers](../../docs/adr/0034-run-test-databases-in-testcontainers.md) and [Give every test a fresh database from a migrated template](../../docs/adr/0035-give-every-test-a-fresh-database-from-a-template.md).

## The container

`src/global-setup.ts` is the root `globalSetup` in `vite.config.ts`, so it runs once for the whole run, before any project's tests. It starts Postgres with [Testcontainers](https://node.testcontainers.org/) and provides its address and credentials to every project's tests. It stops the container when the run ends.

- **The image** is the one `compose.yaml` pins, read with `docker compose config`, so the version and digest have one home and tests run the same Postgres as local development. The run fails if the image isn't pinned by digest.
- **Ryuk**, Testcontainers' clean-up container, removes the run's containers if the run is killed. Its image is pinned by digest in `src/global-setup.ts`, at the version the installed Testcontainers release defaults to. Check it when Testcontainers is upgraded.

Every `vp test` run therefore needs Docker running, with the Compose plugin, but not the Compose stack.

## Templates

Once the container is up, the global setup builds a template database for each service that manages a database: each package that [`@arcturus/workspace`](../workspace/README.md)'s `findMigrationPackages` finds. A template holds:

- the service's committed migrations, run with Graphile Migrate from its `migrations/` folder (never `current.sql`);
- graphile-worker's `graphile_worker` schema, so tests can queue jobs.

It holds no other rows: each test arranges its own data. The run fails if a migration fails.

A template is named after the service's database (its folder, or the game for a game service, with hyphens as underscores): `services/example` has `example_template`. It is marked as a template and accepts no connections, because Postgres can't clone a database that anything is connected to.

## Exports

- **`templateName(database: string): string`:** the name of a service's template, such as `example_template` for `"example"`. Pass it as `cloneDatabase`'s `template`.
- **`cloneDatabase(options: { prefix: string; template?: string; onCleanup: (cleanup: () => Promise<void>) => void }): Promise<ClonedDatabase>`:** creates a database named `<prefix>_test_<random>`, cloned from `template` (by default the empty `template0`), and passes `onCleanup` the function that drops it. Pass `onTestFinished`, or a fixture's `onCleanup`, so the database is dropped when the test ends. `ClonedDatabase` has the database's `name` and `connectionString`. Call it only inside a test or fixture: it reads the container's address with Vitest's `inject`.

## Testing

From the repository root, with Docker running, `vp test packages/test-database` runs the tests. They need the Docker socket, so Claude runs them outside its sandbox.
