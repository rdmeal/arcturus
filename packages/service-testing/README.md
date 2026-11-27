# @arcturus/service-testing

The shared harness that every service's in-process API tests are built on. It's only ever a dev dependency: production code never imports it, and lint enforces that.

How to write a service test with it is in the [service API tests](../../docs/patterns/service-api-test.md) pattern. The Postgres container, the migrated templates and cloning come from [`@arcturus/test-database`](../test-database/README.md).

## Exports

### `createServiceTest({ parseConfig, testConfig, database?, createDeps, createApp, createTaskList?, handlers? })`

Returns a Vitest `test` function with the fixtures below. A service calls it once, in `src/test/test.ts`, and its tests import that `test`:

- **`parseConfig`:** the service's own settings parser.
- **`testConfig`:** the settings to parse for tests. A required database URL can be any placeholder: the app gets the `db` fixture's database instead.
- **`database`:** the service's database name, such as `"example"`, if it has a database. Each test's database is cloned from that service's template.
- **`createDeps`:** builds the service's deps from `{ config, db, clock, worker }`, with a real client for each service it calls.
- **`createApp`:** builds the app from those deps, usually by calling the service's `createApp`.
- **`createTaskList`:** builds the service's task list from those deps, for `runJobs`, if it has jobs.
- **`handlers`:** the default MSW handler of every endpoint the service calls.

It also points the logger at the test output: every log record, at `debug` and above, is printed pretty through `console.log`. Vitest attaches each line to its test, and shows it only when that test fails.

### Fixtures

- **`config`:** the parsed `testConfig`.
- **`client`:** a typed Hono test client for the app, which calls it in-process. The app is built from this test's deps.
- **`network`:** the MSW server, a `Network`. One server per test file answers with the `handlers`, and fails any request no handler matches. A test overrides an endpoint with `network.use(...)`, and its handlers are reset when it ends. It's installed for every test, whether or not the test asks for it.
- **`runJobs(options?)`:** runs the service's queued jobs, on this test's database, until none can run now. It fails, naming each failed job and its error, when a job throws anything other than a domain error, unless `options` is `{ allowFailures: true }`. It needs `database` and `createTaskList`.
- **`worker`:** the `Worker` the app's readiness checks. It runs no jobs, because `runJobs` does. It's running until a test calls `stop()`.
- **`deps`:** the deps from `createDeps`, shared by `client` and `runJobs`. Tests don't use it.
- **`db`:** this test's own database, cloned from the service's template, with a pool on it. The pool is closed and the database dropped when the test ends. Its value is an opaque `TestDatabase`, which a test passes only to its service's `src/test/direct-db.ts` helpers. For a service without a `database`, it stands for no database, and using it fails.
- **`clock`:** a `TestClock`, fixed at `2030-01-01T00:00:00Z`. `now()` reads it, `set(instant)` moves it to a `Date` or ISO string, and `advance(milliseconds)` moves it forward.
- **`captureLogs`:** a function that returns the `LogRecord`s written during this test only. Capturing starts when a test asks for the fixture, and stops when the test ends. Use it only in a test whose subject is the logging (service API tests rule 19).

### `LogRecord`, `TestClock`, `TestDatabase`, `Network`, `AnyHandler` and `RunJobsOptions`

The types of the `captureLogs` records, the `clock` fixture, the `db` fixture, the `network` fixture, the MSW handlers in `handlers`, and `runJobs`'s options. A `LogRecord` is one parsed log record: its fields, keyed by name, such as `msg`, `level` and any fields from `annotate`.

### `@arcturus/service-testing/direct-db`

`connectionOf(db: TestDatabase): Database` gives the database wrapper behind the `db` fixture. Only a service's `src/test/direct-db.ts` may import it: lint forbids it anywhere else (service API tests rule 13).

## Testing

From the repository root, with Docker running, `vp test packages/service-testing`.
