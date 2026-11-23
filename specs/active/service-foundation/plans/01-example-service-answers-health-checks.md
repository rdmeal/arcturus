---
type: plan
---

# Plan 01: Example service answers health checks under test

Implements [ticket 01](../tickets/01-example-service-answers-health-checks.md), part of [the spec](../spec.md).

## Context

- **Test boundary:** three boundaries:
  - `service-runtime`'s own tests: start-up, shutdown and health, against a real server in a child process;
  - the example service's in-process API test, through the `client` fixture;
  - one manual check that the `dev` script runs from `.ts` with `--import` through the workspace symlink.
- **ADRs:**
  - [0009: Build every service with Hono, wired by hand](../../../../docs/adr/0009-build-every-service-with-hono.md): Hono, no DI container, a hand-written composition root.
  - [0018: Run TypeScript source directly](../../../../docs/adr/0018-run-typescript-source-directly.md): erasable syntax only, `.ts` import extensions, ESM only. `exports` point at `.ts` source, with no build.
  - [0041: Start OpenTelemetry from service-runtime with --import](../../../../docs/adr/0041-start-opentelemetry-from-service-runtime-with-import.md): `dev`/`start` run `node --import @arcturus/service-runtime/telemetry src/main.ts`. The entry point stays bare in this ticket.
  - [0039: Log with pino, to stdout and OTLP](../../../../docs/adr/0039-log-with-pino-to-stdout-and-otlp.md): one `log` imported from the runtime, never passed in `deps`. JSON by default, pino-pretty locally.
  - [0031: Load configuration only in each service's config module](../../../../docs/adr/0031-load-configuration-only-in-each-services-config-module.md): only `config.ts` reads env, through dotenv into `{}`. Required settings have no defaults. Tests use `parseConfig`.
  - [0032: Test services mostly through their API](../../../../docs/adr/0032-test-services-through-their-api.md): in-process `testClient` for services. The lifecycle is tested in the runtime.
  - [0020: Guard the dependency supply chain](../../../../docs/adr/0020-guard-the-dependency-supply-chain.md): every new dependency (hono, @hono/node-server, pino, pino-pretty, zod, dotenv) passes the release-age and trust checks.
- **Patterns:**
  - [service-composition-root](../../../../docs/patterns/service-composition-root.md): the example service's files, config and lifecycle. This ticket establishes it.
  - [service-api-test](../../../../docs/patterns/service-api-test.md): the `client` fixture (rules 4, 5), test logs sent to the console (rule 18). Rule 4 is rewritten in step 4. Its exemplar waits for the first slice (ticket 06), because rule 1 puts API tests in slice folders and this ticket has no slices.
  - [observability](../../../../docs/patterns/observability.md): rules 1–3, on how `log` is used.
- **Planning decisions:**
  - **Package names:** `packages/service-runtime` is `@arcturus/service-runtime`, `packages/service-testing` is `@arcturus/service-testing`, and `services/example` is `@arcturus/example-service`. Each package has a `tsconfig.json` extending `tsconfig.base.json`, and `"type": "module"`.
  - **Tests import Vitest APIs from `vite-plus/test`,** which re-exports Vitest, `test.extend` included. No package installs `vitest` directly.
  - **The logger is one pino instance,** created when `service-runtime`'s module loads.
    - Until it is reconfigured, it writes JSON at `info` to stdout.
    - `configureLog({ level, format, destination? })` sets `log.level` and swaps the sink behind a small switchable stream that pino writes to.
    - `pretty` uses pino-pretty as an in-process stream, not a worker-thread transport.
    - The instance never changes, so `import { log }` stays valid. It is created after `--import` has loaded the SDK, so instrumentation-pino will patch it when ticket 09 adds it.
  - **Tests redirect the logger** with `createServiceTest`, which calls `configureLog({ level: 'debug', format: 'pretty', destination: <stream to console.log> })` once, when the factory is called. `destination` is part of the runtime's ordinary API, and service code never calls `configureLog`; only `main.ts` does.
  - **Settings:** the runtime exports two things:
    - a `logSettings` zod shape: `LOG_LEVEL` is an enum of pino levels with default `info`, and `LOG_FORMAT` is `json` | `pretty` with default `json`;
    - `parseSettings(schema, source)`, which throws a `ConfigError` whose message comes from `z.prettifyError`.

    Each service's `parseConfig` calls `parseSettings` and maps the result to camelCase (`{ port, log: { level, format } }`). Loading the env files stays in the service's `config.ts`. `main.ts` catches a `ConfigError`, writes `log.fatal({ err })` and sets `process.exitCode = 1`.

  - **Server and shutdown:** `startServer({ app, port, shutdownTimeoutMs = 10_000 })` is built on `@hono/node-server`. It logs `listening` and `shutting down` at `info`.
    - On SIGTERM or SIGINT it calls `server.close()`, then `closeIdleConnections()`, then waits for requests in flight.
    - If the hard timeout passes first, it calls `process.exit(1)`.
    - 10 s leaves margin inside a typical 30 s termination grace period. Later tickets add the pool, worker and SDK as shutdown steps inside the same timeout.
  - **Health:** the runtime exports `health()`, a Hono sub-app that `createApp` mounts with `.route('/health', health())`.
    - `GET /health/live` answers 200 `{ "status": "live" }`.
    - `GET /health/ready` answers 200 `{ "status": "ready" }`. It has no checks until ticket 05.
  - **The per-service `test` factory:** `createServiceTest({ parseConfig, testConfig, createApp })` lives in `packages/service-testing/src/create-service-test.ts`.
    - Its `createApp` takes the fixtures, as in `({ config }) => createApp({ config })`. Later tickets add `db` and `clock` to that argument.
    - `config` is an overridable fixture option (rule 5).
    - Each service exports `test` from `src/test/test.ts`.
  - **Runtime lifecycle tests spawn a child `node` process** running a fixture server from `.ts`, because only a real process can show the hard-timeout exit.
  - **Vitest projects** are listed in the root `vite.config.ts` from the workspace globs. `passWithNoTests` goes in step 1, along with the first test.
  - **`--import` through the symlink is proven by a manual check:** start `dev` in the background, `curl` both endpoints, then send SIGTERM, all in one command.
  - **`services/example/.env.development`** is written by the maintainer, with a comment linking to the ports table, `PORT=3900` and `LOG_FORMAT=pretty`.

## Steps

- [x] **1. service-runtime package: the logger and settings parsing**
  - **Goal:** `@arcturus/service-runtime` exists, exporting `log`, `configureLog`, `logSettings`, `parseSettings` and `ConfigError`. `vp test` runs its tests through root Vitest projects, and `passWithNoTests` is removed. The build stays green.
  - **Files:**
    - `packages/service-runtime/package.json`: name `@arcturus/service-runtime`, `"type": "module"`, and `exports` pointing at `.ts` source: `"."` → `./src/index.ts`. The `./telemetry` entry comes in step 3. Dependencies: `pino`, `pino-pretty`, `zod`.
    - `packages/service-runtime/tsconfig.json`: extends `../../tsconfig.base.json`.
    - `packages/service-runtime/src/log.ts`:
      - `export const log: Logger`;
      - `export type LogFormat = 'json' | 'pretty'`;
      - `export function configureLog(options: { level: LevelWithSilent; format: LogFormat; destination?: NodeJS.WritableStream }): void`.
    - `packages/service-runtime/src/settings.ts`:
      - `export const logSettings` (a zod shape with `LOG_LEVEL` and `LOG_FORMAT`, with their defaults);
      - `export class ConfigError extends Error`;
      - `export function parseSettings<S extends z.ZodType>(schema: S, source: Record<string, string | undefined>): z.output<S>`.
    - `packages/service-runtime/src/index.ts`: the public exports.
    - `vite.config.ts`: `test.projects` from the workspace globs, and `passWithNoTests` removed.
    - `pnpm-lock.yaml`: updated by `vp install`.
  - **Read first:** [ADR 0039](../../../../docs/adr/0039-log-with-pino-to-stdout-and-otlp.md), [ADR 0020](../../../../docs/adr/0020-guard-the-dependency-supply-chain.md), [observability](../../../../docs/patterns/observability.md) rules 1–3, [service-composition-root](../../../../docs/patterns/service-composition-root.md) rules 2, 7 and 8.
  - **Tests:** unit tests next to each file.
    - `src/settings.test.ts`, `describe('parseSettings')`:
      - "defaults LOG_LEVEL to info and LOG_FORMAT to json when unset";
      - "rejects an invalid LOG_LEVEL with a readable message naming the setting";
      - "rejects an invalid LOG_FORMAT with a readable message naming the setting".
    - `src/log.test.ts`, `describe('configureLog')`:
      - "writes JSON lines to the destination when the format is json";
      - "writes pretty lines when the format is pretty";
      - "drops records below the configured level".
  - **Check:** `vp test --project @arcturus/service-runtime && vp check`

- [x] **2. service-runtime: health endpoints, server start-up and graceful shutdown**
  - **Goal:** the runtime can serve a Hono app with `/health/live` and `/health/ready`, and shuts it down gracefully within a hard timeout. The build stays green.
  - **Files:**
    - `packages/service-runtime/src/health.ts`: `export function health(): Hono`. `GET /live` returns 200 `{ status: 'live' }` and `GET /ready` returns 200 `{ status: 'ready' }`. Chain the routes so their types are inferred.
    - `packages/service-runtime/src/server.ts`: `export function startServer(options: { app: { fetch: (req: Request) => Response | Promise<Response> }; port: number; shutdownTimeoutMs?: number }): Promise<{ port: number; close: () => Promise<void> }>`.
      - It resolves once the server is listening, with the bound port, so port `0` works in tests.
      - It registers SIGTERM and SIGINT handlers that call `close()` and then exit 0. If draining outlasts `shutdownTimeoutMs` (default `10_000`), it calls `process.exit(1)`.
      - It logs `listening` (with the port) and `shutting down` at `info`.
    - `packages/service-runtime/src/index.ts`: exports `health` and `startServer`.
    - `packages/service-runtime/package.json`: adds `hono` and `@hono/node-server`.
    - `packages/service-runtime/test/fixtures/server.ts`: a fixture process that mounts `health()` plus a `GET /slow?ms=` route, starts on port `0` with a short timeout taken from `argv`, and prints the bound port to stdout for the test to read.
  - **Read first:** [service-composition-root](../../../../docs/patterns/service-composition-root.md) rules 17–19, [ADR 0020](../../../../docs/adr/0020-guard-the-dependency-supply-chain.md).
  - **Tests:** `packages/service-runtime/src/server.test.ts`, `describe('startServer')`. Each test spawns the fixture with `node` from `.ts`.
    - "answers /health/live and /health/ready on a running server";
    - "completes a request in flight when SIGTERM arrives";
    - "refuses new connections after SIGTERM";
    - "exits within the hard timeout when a request outlasts it";
    - "exits cleanly on SIGINT".
  - **Check:** `vp test --project @arcturus/service-runtime && vp check`

- [x] **3. Example service: composition root, a bare telemetry entry point and the dev script**
  - **Goal:** `@arcturus/example-service` starts with `vp run --filter @arcturus/example-service dev`, runs from `.ts` (the runtime's included) with the runtime's telemetry entry point loaded through `--import`, logs that it is listening, and answers both health endpoints. The build stays green.
  - **Files:**
    - `packages/service-runtime/src/telemetry.ts`: a bare entry point, with a comment that the instrumentations and exporters arrive in ticket 09.
    - `packages/service-runtime/package.json`: `exports` gains `"./telemetry"` → `./src/telemetry.ts`.
    - `services/example/package.json`: name `@arcturus/example-service`, `"type": "module"`.
      - Scripts: `"dev": "node --watch --import @arcturus/service-runtime/telemetry src/main.ts"` and `"start": "node --import @arcturus/service-runtime/telemetry src/main.ts"`.
      - Dependencies: `@arcturus/service-runtime` (`workspace:*`), `dotenv`, `hono`, `zod`.
    - `services/example/tsconfig.json`.
    - `services/example/src/config.ts`:
      - a schema with `PORT` (`z.coerce.number().int()`, required, no default) plus `...logSettings`;
      - `export type Config = { port: number; log: { level; format } }`;
      - `export function parseConfig(source: Record<string, string | undefined>): Config`, through `parseSettings`, returning a frozen object;
      - `export function loadConfig(): Config`, which loads `.env.development` and then `.env` from `import.meta.dirname/..` with dotenv (`processEnv: {}`, `quiet: true`), lays `process.env` over them, and calls `parseConfig`.
    - `services/example/src/app.ts`: `export type Deps = { config: Config }`, `export function createApp(deps: Deps)`, which returns `new Hono().route('/health', health())`, and `export type AppType`.
    - `services/example/src/main.ts`: calls `loadConfig()`, then `configureLog(config.log)`, then `startServer({ app: createApp({ config }), port: config.port })`. On a `ConfigError` it writes `log.fatal({ err })` and sets `process.exitCode = 1`.
    - `.gitignore`: make sure `.env` is ignored and `.env.development` is not (it is committed).
    - **The maintainer writes** `services/example/.env.development`:
      ```
      # Port allocated in docs/develop/local-development.md#ports
      PORT=3900
      LOG_FORMAT=pretty
      ```
  - **Read first:** [service-composition-root](../../../../docs/patterns/service-composition-root.md) (all of it), [ADR 0031](../../../../docs/adr/0031-load-configuration-only-in-each-services-config-module.md), [ADR 0041](../../../../docs/adr/0041-start-opentelemetry-from-service-runtime-with-import.md), [ADR 0018](../../../../docs/adr/0018-run-typescript-source-directly.md).
  - **Establishes:** [service-composition-root](../../../../docs/patterns/service-composition-root.md) (`services/example/src/main.ts`, `config.ts`, `app.ts`).
  - **Tests:** none automated here; the API test comes in step 4. The config defaults and messages are covered by step 1's `parseSettings` tests.
  - **Check:**
    - `vp check`.
    - The manual smoke check: in one command, start `dev` in the background, wait for the `listening` line, `curl -sf localhost:3900/health/live` and `/health/ready`, then send SIGTERM and see the process exit. Run it without `.env.development` too, and see it fail with a readable message about `PORT`.
    - Also run it with `LOG_FORMAT=nope` and see the readable error.

- [x] **4. service-testing package: the `client` fixture and the example service's first API test**
  - **Goal:** `@arcturus/service-testing` exports `createServiceTest`. The example service's API test calls `/health/live` through the `client` fixture, with config built by `parseConfig` from test values, and test logs go pretty through `console`. Rule 4 of the API test pattern matches the factory. The build stays green.
  - **Files:**
    - `packages/service-testing/package.json`: name `@arcturus/service-testing`, `exports` → `./src/index.ts`. Dependencies: `@arcturus/service-runtime` (`workspace:*`), `hono`, and `vite-plus` as a peer dependency.
    - `packages/service-testing/tsconfig.json`.
    - `packages/service-testing/src/create-service-test.ts`: `export function createServiceTest<TConfig, TApp extends Hono<any, any, any>>(options: { parseConfig: (source: Record<string, string | undefined>) => TConfig; testConfig: Record<string, string>; createApp: (fixtures: { config: TConfig }) => TApp })`.
      - It returns `test.extend` (from `vite-plus/test`) with a `config` fixture option, built by `parseConfig(testConfig)` and overridable per test, and a lazy `client` fixture, `testClient(createApp({ config }))`.
      - It calls `configureLog({ level: 'debug', format: 'pretty', destination })` once, where `destination` is a writable that sends each line to `console.log`.
    - `packages/service-testing/src/index.ts`.
    - `services/example/package.json`: devDependency `@arcturus/service-testing` (`workspace:*`).
    - `services/example/src/test/test.ts`: `export const test = createServiceTest({ parseConfig, testConfig: { PORT: '0' }, createApp: ({ config }) => createApp({ config }) })`.
    - `docs/patterns/service-api-test.md`: rewrite rule 4 so it says tests use the `test` exported by the service's `src/test/test.ts`, built with `createServiceTest({ parseConfig, testConfig, createApp })` from `packages/service-testing`. Keep the fixture list. Check that rules 2 and 5 still agree.
  - **Read first:** [service-api-test](../../../../docs/patterns/service-api-test.md) rules 1–7 and 15–18, [ADR 0032](../../../../docs/adr/0032-test-services-through-their-api.md), and the `writing-docs` skill (for the pattern edit).
  - **Tests:** `services/example/src/health.test.ts`, `describe('GET /health/live')`: "answers that the service is live".
  - **Check:** `vp test --project @arcturus/example-service && vp test && vp check`

- [x] **5. Docs: ports table, codebase guide and composition root exemplar**
  - **Goal:** the documented facts match the code. The build stays green.
  - **Files:**
    - `docs/develop/local-development.md`: add the example service on 3900 to the ports table, marked temporary.
    - `docs/develop/codebase.md`: name `packages/service-runtime` (lifecycle, health, logging and telemetry for every service) and `packages/service-testing` (the shared test harness, only ever a dev dependency). Put them in the layout or the "Inside a service" section, whichever fits the guide.
    - `docs/patterns/service-composition-root.md`: the Exemplar section names `services/example/src/main.ts`, `config.ts` and `app.ts`, and notes that the example service is temporary.
    - `docs/develop/tech-stack.md`: check whether Hono's node server or pino-pretty needs naming. Change it only if the guide lists libraries at that level.
  - **Read first:** the `writing-docs` skill.
  - **Tests:** none.
  - **Check:** `vp check`

**6. Acceptance criteria**, checked at the test boundary:

- [ ] The example service's `dev` script starts it with the runtime's telemetry entry point loaded through `--import`, and the service runs from `.ts` source, including the runtime's, with no build step: proven by the manual smoke check in step 3 and the `dev` script in `services/example/package.json`.
- [ ] `/health/live` and `/health/ready` both answer success on a running service: proven by "answers /health/live and /health/ready on a running server" in `packages/service-runtime/src/server.test.ts`, and by the step 3 smoke check.
- [ ] The runtime's own tests start a real server and show that a request in flight when SIGTERM arrives completes, that new connections are refused, and that the process exits within the hard timeout: proven by "completes a request in flight when SIGTERM arrives", "refuses new connections after SIGTERM" and "exits within the hard timeout when a request outlasts it" in `packages/service-runtime/src/server.test.ts`.
- [ ] The example service's API test calls `/health/live` through the `client` fixture, with configuration built by `parseConfig` from test values, never from env files or `process.env`: proven by "answers that the service is live" in `services/example/src/health.test.ts`, through `services/example/src/test/test.ts`.
- [ ] `LOG_LEVEL` defaults to `info` and `LOG_FORMAT` to `json` when unset. The service's `.env.development` sets `LOG_FORMAT=pretty`. An invalid value fails start-up with a readable message: proven by the `parseSettings` tests in `packages/service-runtime/src/settings.test.ts`, plus the step 3 smoke check with `LOG_FORMAT=nope`.
- [ ] `vp test` runs the workspace packages' tests through Vitest projects in the root config, and `passWithNoTests` is gone: proven by `vp test` and `vite.config.ts`.
- [ ] `vp check` passes.
- [ ] The ports table in the local development guide lists the example service on 3900, marked temporary. Its `.env.development` port links to that table: proven by `docs/develop/local-development.md` and the maintainer's `services/example/.env.development`.
- [ ] The codebase guide names `packages/service-runtime` and `packages/service-testing`: proven by `docs/develop/codebase.md`.
- [ ] The service composition root pattern's exemplar names the example service's composition root: proven by `docs/patterns/service-composition-root.md`.

## Notes

- 2026-11-23: Each package that uses Node APIs or types needs `@types/node` as a devDependency (step 1 added it to `service-runtime`). Later packages (`services/example`, `service-testing`) need it too.
- 2026-11-23: The Vitest `projects` in `vite.config.ts` repeat `pnpm-workspace.yaml`'s globs, with `apps/*` instead of `apps/web`, because Vitest rejects a literal project path that doesn't exist yet.
- 2026-11-23: In Claude's sandbox, `vp check` fails on unreadable placeholder files under `.claude/`, and `vp install` hits a read-only pnpm store. Run both outside the sandbox.
- 2026-11-23: Later shutdown steps (job worker, pool, telemetry flush) go inside the `closing` function in `startServer` (`packages/service-runtime/src/server.ts`), after the server drains. Shutdown calls `closeIdleConnections()` every 20 ms until `server.close` completes, because keep-alive connections that finish their request otherwise hold shutdown open until the hard timeout.
- 2026-11-23: Possible pattern: a lifecycle test spawns a real child process from a fixture under `test/fixtures/`, reads its port from the `listening` log line, and kills it with `onTestFinished` (`packages/service-runtime/src/server.test.ts`).
- 2026-11-23: Step 3's smoke check is `scratchpad/smoke-example-service.sh` (git-ignored), which the maintainer runs with `!`, because Claude's sandbox can't read `.env.development`. It proves the invalid-config path with `PORT=abc` and `LOG_FORMAT=nope` rather than by removing `.env.development`. It passed on 2026-11-23.
- 2026-11-23: `PORT` is a digits-only string converted to a number (`z.string().regex(...).transform(Number).pipe(...)`), because zod 4's `z.coerce.number()` can't follow `z.string().pipe()`, and coercion would turn an empty `PORT` into 0.
- 2026-11-23: A config error is logged before `configureLog` runs, so it comes out as a JSON `fatal` line even locally. It's readable, but includes the stack.
- 2026-11-23: In the installed Vitest (5.1), a test overrides the `config` fixture with `test.override('config', parseConfig({ ... }))`, because `test.scoped` is deprecated. Rule 5 of the service API test pattern says only "fixture option", and could name this once a test first overrides config.
