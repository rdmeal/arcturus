# @arcturus/service-testing

The shared harness that every service's in-process API tests are built on. It's only ever a dev dependency: production code never imports it, and lint enforces that.

How to write a service test with it is in the [service API tests](../../docs/patterns/service-api-test.md) pattern. The Postgres container, the migrated templates and cloning come from [`@arcturus/test-database`](../test-database/README.md).

## Exports

### `createServiceTest({ parseConfig, testConfig, database?, createApp })`

Returns a Vitest `test` function with the fixtures below. A service calls it once, in `src/test/test.ts`, and its tests import that `test`:

- **`parseConfig`:** the service's own settings parser.
- **`testConfig`:** the settings to parse for tests. A required database URL can be any placeholder: the app gets the `db` fixture's database instead.
- **`database`:** the service's database name, such as `"example"`, if it has a database. Each test's database is cloned from that service's template.
- **`createApp`:** builds the app from `{ config, db, clock }`, usually by calling the service's `createApp`.

It also points the logger at the test output: every log record, at `debug` and above, is printed pretty through `console.log`. Vitest attaches each line to its test, and shows it only when that test fails.

### Fixtures

- **`config`:** the parsed `testConfig`.
- **`client`:** a typed Hono test client for the app, which calls it in-process. The app is built with this test's `db` and `clock`.
- **`db`:** this test's own database, cloned from the service's template, with a pool on it. The pool is closed and the database dropped when the test ends. Its value is an opaque `TestDatabase`, which a test passes only to its service's `src/test/direct-db.ts` helpers. For a service without a `database`, it stands for no database, and using it fails.
- **`clock`:** a `TestClock`, fixed at `2030-01-01T00:00:00Z`. `now()` reads it, `set(instant)` moves it to a `Date` or ISO string, and `advance(milliseconds)` moves it forward.
- **`captureLogs`:** a function that returns the `LogRecord`s written during this test only. Capturing starts when a test asks for the fixture, and stops when the test ends. Use it only in a test whose subject is the logging (service API tests rule 19).

### `LogRecord`, `TestClock` and `TestDatabase`

The types of the `captureLogs` records, the `clock` fixture and the `db` fixture. A `LogRecord` is one parsed log record: its fields, keyed by name, such as `msg`, `level` and any fields from `annotate`.

### `@arcturus/service-testing/direct-db`

`connectionOf(db: TestDatabase): Database` gives the database wrapper behind the `db` fixture. Only a service's `src/test/direct-db.ts` may import it: lint forbids it anywhere else (service API tests rule 13).

## Testing

From the repository root, with Docker running, `vp test packages/service-testing`.
