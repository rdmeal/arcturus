---
type: plan
---

# Plan 04: Every request is logged, and annotated IDs reach every log line

Implements [ticket 04](../tickets/04-requests-are-logged-with-annotated-ids.md), part of [the spec](../spec.md).

## Context

- **Test boundary:** three boundaries, from the spec's Testing section:
  - `service-runtime`'s own tests, for annotation without the SDK, concurrent isolation and the request line's shape;
  - `service-testing`'s own test, for `captureLogs` isolation;
  - the example service's API, in-process through the harness, for its request line asserted with `captureLogs`.
- **ADRs:**
  - [0039: Log with pino, to stdout and OTLP](../../../../docs/adr/0039-log-with-pino-to-stdout-and-otlp.md): one `log` imported from `service-runtime`. Request logging is our own small middleware, not `hono-pino`. Tests can't inject a logger, so they capture its output.
  - [0042: Share one observability context between logs and spans](../../../../docs/adr/0042-share-one-observability-context-between-logs-and-spans.md): `annotate()` stores fields in the active OTel Context, and pino's `mixin` reads them. It must work with no span recorded. No Baggage.
  - [0020: Guard the dependency supply chain](../../../../docs/adr/0020-guard-the-dependency-supply-chain.md): the new OTel packages pass the release-age and trust checks that `pnpm-workspace.yaml` enforces on `vp install`.
  - [0009: Build every service with Hono, wired by hand](../../../../docs/adr/0009-build-every-service-with-hono.md): "by hand" is about dependencies (no DI container). A runtime factory for the app skeleton doesn't conflict, and `deps` still pass through `createApp(deps)`.
  - [0049: Build every service's app from one runtime factory](../../../../docs/adr/0049-build-every-services-app-from-one-runtime-factory.md): `createServiceApp()` installs request logging and health first, its parts aren't exported, and it takes no options until one is needed.
- **Patterns:**
  - [observability](../../../../docs/patterns/observability.md): rules 5 to 10. This ticket establishes its exemplar.
  - [service-api-test](../../../../docs/patterns/service-api-test.md): rules 17 to 20. Rule 18: logs still go pretty-printed through `console`. Rule 19: assert log lines only where the log line is the behaviour.
  - [service-composition-root](../../../../docs/patterns/service-composition-root.md): rule 12, which `createApp` follows.
- **Planning decisions:**
  - **`annotate` stays in this ticket, rather than waiting for the OTel SDK.** Service tests never run the SDK (service-api-test rule 20), so the SDK-free path has to be built whatever the order. The SDK only changes who registers the context manager.
  - **Context manager:** `service-runtime` registers `AsyncLocalStorageContextManager` from `@opentelemetry/context-async-hooks` when `context.ts` loads, unless one is already registered (`context.setGlobalContextManager` returns `false`). In ticket 09, the SDK loads first through `--import`, so its manager wins.
  - **Mutable scope:** OTel contexts are immutable, so a scope stores a mutable fields object under a private context key. `annotate` mutates that object. The request middleware opens the scope. An internal `withContextFields(fn)` opens one for jobs in ticket 08. Called outside a scope, `annotate` does nothing.
  - **Span attributes are left out until ticket 09,** which wires the SDK and can test them. No untested span code goes in here.
  - **The app skeleton comes from one factory, `createServiceApp()`,** in `service-runtime`. Every service is wired the same way, a change applies to every service from one place, and the middleware is always registered before any route. It takes no options until one is needed. Ticket 07 adds `onError` to it.
  - **Exports are minimised.** `health` and `requestLogging` aren't exported; only the factory mounts them. `withContextFields` isn't exported until 08 needs it.
  - **The request line** is `log.info({ method, route, status, durationMs }, "request completed")`. `route` is `routePath(c, -1)` from `hono/route`, read after `await next()`, as checked against Hono's current docs. `route` is left out when no handler matched (a 404).
  - **Health requests log at `debug`,** so probes don't drown the request lines at the default `info` level. They still show in tests and with `LOG_LEVEL=debug`. Until ticket 06, health is the example service's only endpoint, so criterion 1 is proven in two parts: the `info` line by the runtime's test with a fixture route, and end to end by the example service's test of its health line at `debug`.
  - **`captureLogs` changes nothing in `service-runtime`.** The harness configures the logger as `format: "json"` with its own destination, which:
    - parses each line;
    - hands the record to the active capture;
    - pretty-prints it to `console` with pino-pretty's `prettyFactory`.

    The fixture is lazy: it opens a capture when a test asks for it and closes it on teardown. Its value is `() => LogRecord[]` (`LogRecord = Record<string, unknown>`).

  - **Log output is asserted only in tests about logging,** in their own files (`request-log.test.ts`, `capture-logs.test.ts`), never in tests of other behaviour.

## Steps

- [x] **1. Observability context: `annotate` and the log mixin**
  - **Goal:** fields annotated inside a scope reach every later log line of that scope, with no OTel SDK running. The build stays green, and nothing calls it yet outside tests.
  - **Files:**
    - `packages/service-runtime/package.json`: add `@opentelemetry/api` and `@opentelemetry/context-async-hooks` with `vp install`. If the release-age or trust check refuses a version, take the newest that passes, and record it in Notes.
    - `packages/service-runtime/src/context.ts` (new):
      - `type ContextFields = Record<string, string | number | boolean>`;
      - registers the context manager when the module loads, unless one is already registered;
      - `annotate(fields: ContextFields): void`;
      - `withContextFields<T>(fn: () => T): T`, which opens a scope with an empty mutable fields object;
      - `currentContextFields(): ContextFields`, used by the mixin.
    - `packages/service-runtime/src/log.ts`: pino `mixin: currentContextFields`. Fields passed explicitly to a log call still win, which is pino's default merge order.
    - `packages/service-runtime/src/index.ts`: export `annotate` only.
  - **Read first:** [ADR 0042](../../../../docs/adr/0042-share-one-observability-context-between-logs-and-spans.md), [observability](../../../../docs/patterns/observability.md) rules 7 to 10. Check `@opentelemetry/api` context docs through context7 for `setGlobalContextManager` and `createContextKey`.
  - **Tests:** `packages/service-runtime/src/context.test.ts`, capturing with `configureLog({ format: "json", destination })` as `log.test.ts` does:
    - "an annotated field appears on every later log line in the scope";
    - "a field annotated in one scope never appears on a concurrent scope's lines" (two scopes interleaved across `await`s);
    - "annotate outside a scope adds nothing to log lines";
    - "a field passed to the log call overrides an annotated one".
  - **Check:** `vp test packages/service-runtime/src/context.test.ts`, then `vp check`

- [x] **2. `createServiceApp()` with request logging**
  - **Goal:** every service builds its app from one runtime factory, which logs one line per request and opens the context scope. The example service and the runtime's server fixture use it. The build stays green.
  - **Files:**
    - `packages/service-runtime/src/service-app.ts` (new):
      - `createServiceApp()`, which returns `new Hono().use(requestLogging()).route("/health", health())`, with the disable comment every Hono app builder carries;
      - a non-exported `requestLogging()` middleware: opens `withContextFields`, times `await next()`, then logs `{ method, route, status, durationMs }` with `"request completed"`. It logs at `info`, or `debug` when the route is under `/health`, and leaves `route` out when no handler matched.
    - `packages/service-runtime/src/index.ts`: export `createServiceApp`, and stop exporting `health`.
    - `packages/service-runtime/test/fixtures/server.ts`: `createServiceApp().get("/slow", …)`.
    - `services/example/src/app.ts`: `createServiceApp()` replaces `new Hono().route("/health", health())`.
  - **Read first:** [ADR 0049](../../../../docs/adr/0049-build-every-services-app-from-one-runtime-factory.md), [ADR 0039](../../../../docs/adr/0039-log-with-pino-to-stdout-and-otlp.md), [observability](../../../../docs/patterns/observability.md) rules 3, 5 and 6, [service-composition-root](../../../../docs/patterns/service-composition-root.md) rule 12. Hono's `hono/route` helper docs through context7 (`routePath(c, -1)`, `matchedRoutes`), to tell an unmatched request apart.
  - **Tests:** `packages/service-runtime/src/service-app.test.ts`, using `app.request()` on `createServiceApp().get("/things/:id", …)` and capturing JSON as in step 1:
    - "a request produces exactly one info line with method, matched route, status and duration";
    - "a health request is logged at debug, not info";
    - "a request no route matches is logged without a route";
    - "a field annotated by a handler appears on its request's line";
    - "concurrent requests each carry only their own annotated fields".

    The existing `server.test.ts` and `services/example/src/health.test.ts` must still pass unchanged.

  - **Check:** `vp test packages/service-runtime`, `vp test services/example`, then `vp check`

- [x] **3. `captureLogs` in the test harness**
  - **Goal:** a test can ask for the log records written during that test only, and logs are still pretty-printed through `console` (service-api-test rule 18). The build stays green.
  - **Files:**
    - `packages/service-testing/package.json`: add `pino-pretty`, at the version `service-runtime` already uses.
    - `packages/service-testing/src/create-service-test.ts`:
      - `configureLog({ level: "debug", format: "json", destination })`;
      - the destination parses each line, pushes the record to the active capture if there is one, and prints `prettyFactory()(record)` (options such as `colorize` are chosen in `/implement`) through `console.log`;
      - adds the lazy fixture `.extend("captureLogs", …)`, which opens a capture, returns `() => LogRecord[]`, and closes it on teardown;
      - exports `type LogRecord = Record<string, unknown>`.
    - `packages/service-testing/src/index.ts`: export `LogRecord`.
  - **Read first:** [service-api-test](../../../../docs/patterns/service-api-test.md) rules 17 to 20. Vitest fixture docs through context7 (`test.extend` fixtures with teardown, lazy fixtures).
  - **Tests:** `packages/service-testing/src/capture-logs.test.ts`, with `createServiceTest` over a tiny `createServiceApp()` app, in order in one file:
    - "a test that logs without capturing" (logs a record with a marker field);
    - "captureLogs returns only the records written during its own test" (sends a request, then asserts its line is there and the earlier marker isn't).
  - **Check:** `vp test packages/service-testing/src/capture-logs.test.ts`, then `vp check`

- [x] **4. The example service's request-log test**
  - **Goal:** the example service shows its request line end to end, through the harness and `captureLogs`.
  - **Files:** `services/example/src/request-log.test.ts` (new).
  - **Read first:** [service-api-test](../../../../docs/patterns/service-api-test.md) rule 19.
  - **Tests:** "a health check is logged once, at debug, with method, matched route, status and duration". It sends `client.health.live.$get()` and asserts exactly one `"request completed"` record, with `level` debug, `method: "GET"`, `route: "/health/live"`, `status: 200` and a numeric `durationMs`.
  - **Check:** `vp test services/example/src/request-log.test.ts`, then `vp check`

- [x] **5. Package READMEs**
  - **Goal:** contributors can find what each package exports and how to call it, without reading its source. The build stays green.
  - **Files:**
    - `packages/service-runtime/README.md` (new, no frontmatter): what the package is, then its exports with their signatures:
      - `createServiceApp()` and what it installs (request logging, the health endpoints and, from ticket 07, the error handler);
      - `annotate`;
      - `log` and `configureLog`;
      - `startServer`;
      - `parseSettings`, `logSettings` and `ConfigError`;
      - the `@arcturus/service-runtime/telemetry` entry point.

      It ends with how to test the package. For when and how to use each export, it links the patterns (service-composition-root rule 12, observability) rather than restating their rules.

    - `packages/service-testing/README.md` (new, no frontmatter): what the package is, that it is only ever a dev dependency, `createServiceTest` and its options, and the `config`, `client` and `captureLogs` fixtures, with `LogRecord`. It links the service-api-test pattern for how tests are written. Ticket 06 extends it with the container, templates and cloning.
    - `tools/lint-rules/README.md` (new, no frontmatter): what the package is (the local Oxlint JS plugin, `@arcturus/lint-rules`), the rule it provides (`arcturus/disable-needs-reason`), how to test it, and a link to `docs/develop/linting.md`, which stays the home of what lint enforces.
    - `services/example/README.md` (new, no frontmatter): a temporary example service with a message domain, which proves the runtime, the harness and the patterns in a real package and holds their exemplars until real services replace it. It says that it will be deleted, that it uses port 3900, and how to run it (`dev`) and test it. It doesn't link the spec, because the spec's folder moves to `specs/archive/` when the feature is done.
  - **Read first:** the `writing-docs` skill, and `docs/develop/writing-docs.md#package-readmes` for what a README holds.
  - **Tests:** none.
  - **Check:** `vp check`

- [x] **6. Pattern exemplars**
  - **Goal:** the patterns' exemplars name the code this ticket wrote. Their rules were already updated during planning (see Notes).
  - **Files:**
    - `docs/patterns/observability.md`: Exemplar: `packages/service-runtime/src/context.ts` (`annotate`), `packages/service-runtime/src/service-app.ts` (`createServiceApp`, its request logging), and `services/example/src/request-log.test.ts`.
    - `docs/patterns/service-composition-root.md`: its exemplar line for `services/example/src/app.ts`, which now starts from `createServiceApp()`.
  - **Read first:** the `writing-docs` skill and the `pattern` skill.
  - **Tests:** none.
  - **Check:** `vp check`

**7. Acceptance criteria**, checked at the test boundary:

- [x] A request to the example service produces exactly one `info` line with method, matched route, status and duration: proven by "a request produces exactly one info line with method, matched route, status and duration" in `packages/service-runtime/src/service-app.test.ts`. End to end, it's proven by "a health check is logged once, at debug, with method, matched route, status and duration" in `services/example/src/request-log.test.ts`. Health is logged at `debug` by a planning decision, and it's the example service's only endpoint until ticket 06.
- [x] A field annotated during a request appears on every later log line of that request, and on no line of a concurrent request: proven by "an annotated field appears on every later log line in the scope" and "a field annotated in one scope never appears on a concurrent scope's lines" in `packages/service-runtime/src/context.test.ts`, and by "concurrent requests each carry only their own annotated fields" in `packages/service-runtime/src/service-app.test.ts`.
- [x] Annotated fields reach log lines with no OTel SDK running, as in tests: proven by the `context.test.ts` and `service-app.test.ts` tests above, which run without the SDK.
- [x] `captureLogs` returns only the records written during the test that asked for it, even when other tests run in the same worker: proven by "captureLogs returns only the records written during its own test" in `packages/service-testing/src/capture-logs.test.ts`.
- [x] The observability pattern's exemplar names the example service's use of annotation, or the runtime's middleware if the service has no annotating handler yet: proven by step 6's exemplar in `docs/patterns/observability.md`.

## Notes

- 2026-11-23, during planning: [ADR 0049](../../../../docs/adr/0049-build-every-services-app-from-one-runtime-factory.md) was written, and the pattern rules were updated on this branch: observability rules 5 and 6 (a new rule, so later rules moved up by one), service-composition-root rules 12 and 17, error-handling rule 5, and service-api-test rule 19. The documentation step (now step 6) only fills in exemplars, and the note for ticket 07 was dropped, since error-handling rule 5 already says the factory installs the error handler.
- 2026-11-23, during planning: step 5 was added to give `service-runtime`, `service-testing`, `tools/lint-rules` and `services/example` their READMEs, following the new Package READMEs section of `docs/develop/writing-docs.md`. This is the first ticket to give `service-runtime` and `service-testing` an API that services call, and the other two had no README yet. The exemplars step became step 6, and acceptance criteria step 7. Ticket 06's README criterion now extends the harness README rather than creating it.
- 2026-11-23: Step 1 added `@opentelemetry/api` 1.10.0 and `@opentelemetry/context-async-hooks` 3.1.1, both passing the supply-chain checks. In Claude's sandbox, `vp add` (read-only pnpm store) and `vp check` (unreadable placeholder dotfiles) only run outside the sandbox. Strict lint rejects `as` casts on parsed JSON and `expect.anything()`-style matchers (they're `any`): parse log lines with a zod record schema and compare plain values, as `context.test.ts` does.
- 2026-11-23: Step 2 reads the route from `matchedRoutes(c).at(-1)` (from `hono/route`) rather than `routePath(c, -1)`: its `handler` is compared with the middleware itself, which is the last match only when no route matched (a 404). `durationMs` is rounded to microseconds.
- 2026-11-23: Step 3 also added `zod` to `service-testing`, to parse log lines without a cast. `captureLogs` returns `readonly LogRecord[]`. A Vitest fixture with no dependencies must still destructure its first parameter (`({}, { onCleanup })`), so it carries a reasoned `no-empty-pattern` disable.
