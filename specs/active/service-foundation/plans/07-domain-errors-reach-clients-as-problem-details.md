---
type: plan
---

# Plan 07: Domain errors reach clients as problem details

Implements [ticket 07](../tickets/07-domain-errors-reach-clients-as-problem-details.md), part of [the spec](../spec.md).

## Context

- **Test boundary:** two boundaries, from the spec's Testing section:
  - the example service's HTTP API, in-process through the harness, for the not-found case, an invalid request, the debug-only logging of a domain error and the typed client's error responses;
  - `service-runtime`'s own tests, for what the example service can't reach without a contrived slice: every category's status, the unexpected-error 500 and its log line, and rollback on a domain error thrown inside a transaction.
- **ADRs:**
  - [0024: Signal expected failures with thrown domain errors](../../../../docs/adr/0024-signal-expected-failures-with-thrown-domain-errors.md): one `DomainError` base with `NotFoundError` (404), `ConflictError` (409) and `RuleViolationError` (422), each thrown with a kebab-case code and a client-facing message; RFC 9457 bodies with a `code` member; the shape declared with `ApplyGlobalResponse`; any other error is a 500 that reveals nothing; handlers never throw `HTTPException`.
  - [0049: Build every service's app from one runtime factory](../../../../docs/adr/0049-build-every-services-app-from-one-runtime-factory.md): `createServiceApp()` installs the error handler; services never call `onError`.
  - [0022: Open database transactions explicitly in handlers](../../../../docs/adr/0022-open-database-transactions-explicitly-in-handlers.md): a throw inside `db.transaction` rolls it back, with no extra machinery.
  - [0010: Use zod as the only schema library](../../../../docs/adr/0010-use-zod-as-the-only-schema-library.md): request validation stays zod through `@hono/zod-validator`.
  - [0020: Guard the dependency supply chain](../../../../docs/adr/0020-guard-the-dependency-supply-chain.md): `@hono/zod-validator` is already in the workspace; adding it to `service-runtime` adds no new package.
- **Patterns:**
  - [error handling](../../../../docs/patterns/error-handling.md): the whole ticket; its exemplar is "None yet", so step 1 establishes it.
  - [observability](../../../../docs/patterns/observability.md): rule 4 (domain errors over HTTP at `debug` only), rule 5 (the runtime logs 500s) and rule 13 (the error goes in `err`).
  - [vertical slices](../../../../docs/patterns/vertical-slice.md): rule 8 names `zValidator`, and changes to `validateRequest`.
  - [service API tests](../../../../docs/patterns/service-api-test.md): the example's tests; assertions on problem details and captured logs.
  - [service composition root](../../../../docs/patterns/service-composition-root.md): rule 12, `AppType`.
- **Planning decisions:**
  - **The problem-details body** is `{ type: "about:blank", title, status, detail, code }`, sent as `application/problem+json`. `title` is the status's reason phrase and `detail` the error's message. `code` is what the frontend translates; `type` stays `about:blank` and is not used for translation, and `title` and `detail` are English fallbacks.
  - **Validation failures** answer 400 with code `invalid-request` and an `issues` member of `{ path, code, message }`, where `code` is zod's own issue code (`too_small`, `invalid_type`) passed through unchanged, so the frontend has something to translate per field. zod's issue parameters (such as a minimum) are left out until the frontend needs them.
  - **Unexpected errors** answer 500 with code `internal-error` and a fixed `detail`, with nothing taken from the error.
  - **Codes are checked by the pattern only**, with no kebab-case check at run time.
  - **`validateRequest(target, schema)`** in `service-runtime` wraps `zValidator` with a hook that throws an internal `RequestValidationError`, which the error handler maps to 400. A shared hook passed by every route was rejected as easy to forget. `@hono/zod-validator` moves to `service-runtime`, and lint bans importing it anywhere else.
  - **The runtime exports `ProblemDetails` and `WithProblemDetails<App>`**, which applies `ApplyGlobalResponse` for 400, 404, 409, 422 and 500, so a service's `AppType` is `WithProblemDetails<ReturnType<typeof createApp>>` and never repeats the shape.
  - **Rollback is proven in `service-runtime`'s database tests**, not through a contrived example slice. The end-to-end case (a failing command leaves no message and no job) comes with ticket 08's real command.
  - **The 500 is proven in `service-runtime`'s tests only**, not by breaking the example's table through the direct-database escape hatch.
  - **Recording errors on the active span** (observability rule 5) waits for ticket 09, since `telemetry.ts` doesn't yet set up tracing.

## Steps

- [x] **1. Domain errors and the error handler in `createServiceApp`**
  - **Goal:** `service-runtime` exports the domain error categories, and every app built by `createServiceApp()` answers domain errors and unexpected errors with problem details, logged at the right levels. The example service is unchanged and the build stays green.
  - **Files:**
    - `packages/service-runtime/src/domain-error.ts` (new): abstract `DomainError extends Error` with `constructor(code: string, message: string)` and a readonly `code`; `NotFoundError`, `ConflictError` and `RuleViolationError`. No constructor parameter properties (erasable TypeScript only).
    - `packages/service-runtime/src/problem-details.ts` (new): the `ProblemDetails` interface (`type`, `title`, `status`, `detail`, `code`, optional `issues: { path: string; code: string; message: string }[]`), the one category-to-status mapping, the error handler (`errorHandler: ErrorHandler`, not exported from the index) and `WithProblemDetails<App>` built on `ApplyGlobalResponse` from `hono/client`. The handler logs a domain error with `log.debug({ code }, …)` and an unexpected error with `log.error({ err }, …)`, and answers with `application/problem+json`.
    - `packages/service-runtime/src/service-app.ts`: `createServiceApp` chains `.onError(errorHandler)`.
    - `packages/service-runtime/src/index.ts`: export `DomainError`, `NotFoundError`, `ConflictError`, `RuleViolationError`, `type ProblemDetails` and `type WithProblemDetails`.
  - **Read first:** [ADR 0024](../../../../docs/adr/0024-signal-expected-failures-with-thrown-domain-errors.md), [error handling](../../../../docs/patterns/error-handling.md), [observability](../../../../docs/patterns/observability.md) rules 3–5 and 13. Check with context7 how Hono's `onError` handles errors from routes mounted with `.route()`, and `ApplyGlobalResponse`'s signature.
  - **Establishes:** [error handling](../../../../docs/patterns/error-handling.md)
  - **Tests:** in `packages/service-runtime/src/service-app.test.ts`, with test routes on `createServiceApp()` that throw:
    - `a not-found error answers 404 problem details with its code and message`
    - `a conflict error answers 409 problem details with its code and message`
    - `a rule violation error answers 422 problem details with its code and message`
    - `a domain error is logged at debug and at no higher level`
    - `an unexpected error answers 500 problem details with nothing from the error` (the error's message holds SQL and the body is checked not to contain it, its stack or its name)
    - `an unexpected error is logged at error with the error as err`
    - `problem details are sent as application/problem+json`
  - **Check:** `! vp test packages/service-runtime/src/service-app.test.ts`, then `vp check`

- [x] **2. Prove that a domain error rolls a transaction back**
  - **Goal:** a runtime test shows that a domain error thrown inside `db.transaction` leaves nothing it wrote, and reaches the caller unchanged. No production code changes.
  - **Files:** `packages/service-runtime/src/database.test.ts` (a new test, using the file's `openDatabase` and a table created as `withThings` does).
  - **Read first:** [database transactions](../../../../docs/patterns/database-transaction.md)
  - **Tests:** `a domain error thrown inside a transaction rolls it back and reaches the caller`: insert a row, throw a `ConflictError`, assert the rejection is that same error and that the row isn't there.
  - **Check:** `! vp test packages/service-runtime/src/database.test.ts`

- [x] **3. Turn validation failures into problem details with `validateRequest`**
  - **Goal:** an invalid request to any service answers 400 problem details with `invalid-request` and its issues. Both example routes use `validateRequest`, and lint stops `@hono/zod-validator` being imported outside `service-runtime`. The build stays green.
  - **Files:**
    - `packages/service-runtime/src/validate-request.ts` (new): `validateRequest(target, schema)`, wrapping `zValidator` with a hook that throws `RequestValidationError` (internal, holding the issues as `{ path, code, message }`, with `path` joined from zod's path). Keep the return type inferred, so `c.req.valid(...)` stays typed, with the disable comment every inferred Hono builder carries.
    - `packages/service-runtime/src/problem-details.ts`: map `RequestValidationError` to 400, code `invalid-request`, with `issues`. It isn't a `DomainError`, so services can't throw it.
    - `packages/service-runtime/src/index.ts`: export `validateRequest`.
    - `packages/service-runtime/package.json`: add `@hono/zod-validator` (same version range as the example's); `services/example/package.json`: remove it. Run `vp install`.
    - `services/example/src/messaging/get-message/route.ts`, `services/example/src/messaging/send-message/route.ts`: `validateRequest` in place of `zValidator`.
    - `vite.config.ts`: add `@hono/zod-validator` to `productionImportBans`, with a message pointing at error-handling rule 7, plus an override for `packages/service-runtime/src/validate-request.ts` that allows it. A later override replaces an earlier one's options, so the override must keep the other production bans, not turn the rule off.
  - **Read first:** [vertical slices](../../../../docs/patterns/vertical-slice.md) rule 8, [error handling](../../../../docs/patterns/error-handling.md) rule 7, `docs/develop/linting.md`. Check with context7 the `zValidator` hook's signature and whether throwing from it reaches `onError`.
  - **Tests:** in `packages/service-runtime/src/service-app.test.ts`, with a test route using `validateRequest`:
    - `an invalid request answers 400 problem details with invalid-request and each issue's path, code and message`
    - `a valid request reaches the handler with its parsed input`
  - **Check:** `! vp test packages/service-runtime/src/service-app.test.ts`, then `vp check` (lint shows the ban by passing; to see it fire, temporarily import `@hono/zod-validator` in an example file)

- [x] **4. The example service answers not-found and invalid requests, and its client knows the error shape**
  - **Goal:** getting an unknown message answers 404 `message-not-found`; a send with an invalid body answers 400; the typed client narrows every route's error responses to `ProblemDetails`.
  - **Files:**
    - `services/example/src/messaging/get-message/queries.ts`: `selectMessage` uses `connection.maybeOne` and returns `Promise<MessageRow | null>` (Slonik's `one` throws Slonik's own `NotFoundError`, which would answer 500).
    - `services/example/src/messaging/get-message/handler.ts`: throw `new NotFoundError("message-not-found", "No message has this ID.")` when there's no row.
    - `services/example/src/test/test.ts`: `createApp` declared as returning `AppType`, so the `client` fixture, typed from that return, knows the problem-details responses.
    - `packages/service-runtime/test/capture-log.ts`, `packages/service-runtime/src/problem-details.test.ts`: `silenceLog()`, called by each test that doesn't capture logs, so no request lines reach the test output.
    - `packages/service-runtime/src/domain-error.ts`: the `max-classes-per-file` disable on one line, not the whole file.
  - **Read first:** [error handling](../../../../docs/patterns/error-handling.md) rules 1–3 and 8, [service API tests](../../../../docs/patterns/service-api-test.md), [vertical slices](../../../../docs/patterns/vertical-slice.md)
  - **Tests:**
    - `services/example/src/messaging/get-message/get-message.test.ts`:
      - `answers 404 problem details with message-not-found for an unknown message ID`, with `expectTypeOf` that a 404 response's `json()` is `ProblemDetails`
      - `logs an unknown message ID at debug and at no higher level`, using `captureLogs`
    - `services/example/src/messaging/send-message/send-message.test.ts`:
      - `answers 400 problem details with invalid-request for an empty body`, with `expectTypeOf` that a 400 response's `json()` is `ProblemDetails`
  - **Check:** `! vp test services/example`, then `vp check`

- [ ] **5. Document error handling and `validateRequest`**
  - **Goal:** the docs match the code, and the error-handling pattern names its exemplar.
  - **Files:**
    - `docs/patterns/error-handling.md`:
      - rule 7: validation goes through `validateRequest` from `service-runtime`; each issue is `{ path, code, message }`, with zod's issue code;
      - rule 5: the body has `type: "about:blank"` and the frontend translates `code`;
      - the exemplar names the example service's not-found case (`services/example/src/messaging/get-message/handler.ts`) and the runtime's error handler (`packages/service-runtime/src/problem-details.ts`).
    - `docs/patterns/service-api-test.md` rule 4: `src/test/test.ts` declares its `createApp` as returning the service's `AppType`, so the `client` fixture knows the problem-details responses.
    - `docs/patterns/vertical-slice.md` rule 8: `validateRequest` from `@arcturus/service-runtime` in place of `zValidator` from `@hono/zod-validator`.
    - `docs/patterns/service-composition-root.md` rule 12: `AppType` is wrapped in `WithProblemDetails`.
    - `packages/service-runtime/README.md`:
      - `createServiceApp` installs the error handler;
      - new entries for the domain errors, `validateRequest`, `ProblemDetails` and `WithProblemDetails`.
  - **Read first:** the `writing-docs` skill, the `pattern` skill (exemplars)
  - **Tests:** none
  - **Check:** `vp check`

**6. Acceptance criteria**, checked at the test boundary:

- [ ] Getting an unknown message ID answers `404` problem details with the not-found code: proven by `answers 404 problem details with message-not-found for an unknown message ID` in `services/example/src/messaging/get-message/get-message.test.ts`
- [ ] A send request with an invalid body answers `400` problem details: proven by `answers 400 problem details with invalid-request for an empty body` in `services/example/src/messaging/send-message/send-message.test.ts`
- [ ] An unexpected error answers `500` problem details with no message, stack or internal detail, and is logged at `error` with the cause: proven by `an unexpected error answers 500 problem details with nothing from the error` and `an unexpected error is logged at error with the error as err` in `packages/service-runtime/src/problem-details.test.ts`
- [ ] A domain error over HTTP is logged at `debug` and at no higher level: proven by `logs an unknown message ID at debug and at no higher level` in `services/example/src/messaging/get-message/get-message.test.ts` and `a domain error is logged at debug and at no higher level` in `packages/service-runtime/src/problem-details.test.ts`
- [ ] A domain error thrown inside a transaction rolls the transaction back: nothing it wrote is visible afterwards: proven by `a domain error thrown inside a transaction rolls it back and reaches the caller` in `packages/service-runtime/src/database.test.ts`
- [ ] The typed client sees the error responses on every route: proven by the `expectTypeOf` checks in the 404 and 400 tests of `get-message.test.ts` and `send-message.test.ts`, type-checked by `vp check`
- [ ] The error handling pattern's exemplar names the example service's not-found case and the runtime's error handler: proven by the Exemplar section of `docs/patterns/error-handling.md`

## Notes

- 2026-11-26: Step 3 split the error-handling and validation tests out of `service-app.test.ts` into `packages/service-runtime/src/problem-details.test.ts`, because lint's `max-lines` and `max-dependencies` failed on one file. Both files share `packages/service-runtime/test/capture-log.ts`.
- 2026-11-26: Step 3 wrapped the example's `AppType` in `WithProblemDetails`, moved forward from step 4: without the zod-validator 400 in the route types, `arrange.ts`'s status check narrowed to `never`. Step 4 now changes the harness's `client` fixture instead.
- 2026-11-26: Step 3 also maps Hono's `HTTPException(400)` (thrown for a body that isn't JSON, before zod runs) to 400 `invalid-request` without `issues`, tested by `a malformed JSON body answers 400 problem details with invalid-request`. Any other `HTTPException` still answers 500.
- 2026-11-26: Step 3 added the zod-validator ban to `docs/develop/linting.md`'s guard rails table.
- 2026-11-26: Step 4 typed the `client` fixture through the service's `src/test/test.ts` (`createApp: (…): AppType => createApp(…)`) instead of in the harness. A generic `TApp` isn't assignable to `WithProblemDetails<TApp>`, so the harness would have needed `as unknown as` and a lint disable, while a concrete app is assignable with no cast.
- 2026-11-26: Type tests use `expectTypeOf<InferResponseType<typeof route, status>>()` from `hono/client`, because a status check with `expect` doesn't narrow the response.
