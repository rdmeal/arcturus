# @arcturus/service-testing

The shared harness that every service's in-process API tests are built on. It's only ever a dev dependency: production code never imports it, and lint enforces that.

How to write a service test with it is in the [service API tests](../../docs/patterns/service-api-test.md) pattern.

## Exports

### `createServiceTest({ parseConfig, testConfig, createApp })`

Returns a Vitest `test` function with the fixtures below. A service calls it once, in `src/test/test.ts`, and its tests import that `test`:

- **`parseConfig`:** the service's own settings parser.
- **`testConfig`:** the settings to parse for tests.
- **`createApp`:** builds the app from the fixtures, usually by calling the service's `createApp`.

It also points the logger at the test output: every log record, at `debug` and above, is printed pretty through `console.log`. Vitest attaches each line to its test, and shows it only when that test fails.

### Fixtures

- **`config`:** the parsed `testConfig`.
- **`client`:** a typed Hono test client for the app, which calls it in-process.
- **`captureLogs`:** a function that returns the `LogRecord`s written during this test only. Capturing starts when a test asks for the fixture, and stops when the test ends. Use it only in a test whose subject is the logging (service API tests rule 19).

### `LogRecord`

One parsed log record: its fields, keyed by name, such as `msg`, `level` and any fields from `annotate`.

## Testing

From the repository root, `vp test packages/service-testing`.
