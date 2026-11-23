---
type: pattern
summary: Use when a test must observe a real process (signal handling, exit codes, real sockets) — spawn a fixture script with node, read its port from its listening log line, and kill it with onTestFinished.
tags: [backend, testing]
---

# Child-process tests

Some behaviour only shows in a real process: how it handles a signal, the code it exits with, and whether it still accepts connections. A child-process test runs a small fixture script as its own `node` process and checks that behaviour from outside, the way an orchestrator or a client would.

## When to use it

- Testing lifecycle code, such as graceful shutdown, the hard shutdown timeout and signal handling.
- Testing anything that ends in the process exiting, or that needs real sockets and connections.

## When not to

- For a service's behaviour. Test it in-process through its API (see [Service API tests](./service-api-test.md)).
- For pure functions and shared utilities. Unit-test them directly.

## Rules

1. Spawn a process only for behaviour an in-process test can't observe: signal handling, exit codes, the hard timeout, or connections being refused. Test everything else in-process.
2. The process under test is a fixture script in the package's `test/fixtures/`, named after what it runs (`server.ts`). It imports the package's own `src` by relative path, takes its parameters from `process.argv`, and is written in erasable TypeScript so plain `node` runs it. The package's `tsconfig.json` includes `test`, so the fixture is type-checked.
3. Run the fixture with `process.execPath`, never through a shell or `vp`. Pipe its stdout, and pass its stderr through (`inherit`), so a crash shows in the test output.
4. The fixture listens on port `0`. The test reads the bound port from the fixture's `listening` log line on stdout. Never use a fixed port, because test files run in parallel.
5. One plain helper in the test file, `startFixture(options)`, spawns the child and waits until it is listening. It returns the child, its base URL and an `exited` promise of `{ code, signal }`. If the child exits before it is listening, the helper rejects.
6. Register `onTestFinished(() => child.kill('SIGKILL'))` as soon as the child is spawned, so no process outlives its test. Never use `beforeEach`, `afterEach` or the other hooks.
7. Keep the fixture's timeouts short (a few hundred milliseconds), and size slow requests against them. Assert on elapsed time only with a generous bound, several times the timeout, so a slow CI runner doesn't make the test flaky.
8. Assert on what a caller of the process sees: responses, refused connections and the exit code. Don't assert on log lines beyond reading the port.

## Exemplar

`packages/service-runtime/src/server.test.ts`, `startFixture`, with its fixture `packages/service-runtime/test/fixtures/server.ts`: reading the port from the `listening` line, cleaning up with `onTestFinished`, and the hard-timeout test (`exits within the hard timeout when a request outlasts it`).

## Related

- [Test services mostly through their API, in-process](../adr/0032-test-services-through-their-api.md): why lifecycle behaviour is tested separately from services.
- [Service API tests](./service-api-test.md)
