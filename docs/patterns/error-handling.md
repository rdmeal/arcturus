---
type: pattern
summary: Use when a handler can fail for an expected reason — throw a DomainError category with a kebab-case code, and let the service's onError turn it into problem details.
tags: [backend]
---

# Error handling

Expected failures are thrown as domain errors, and one error handler per service turns them into RFC 9457 problem details. Throwing rolls back any open transaction, and clients get one consistent, safe error body.

## When to use it

Whenever a handler meets a failure that is part of normal operation: something doesn't exist, the current state doesn't allow the operation, or the input breaks a rule.

## When not to

- Malformed requests never reach a handler: the route's `validateRequest` rejects them with the same problem-details shape (rule 7).
- Bugs, and failures of infrastructure such as the database or the network, are never wrapped in a domain error. Let them throw.

## Rules

1. Domain errors come from `packages/service-runtime`. Throw one of the category subclasses of `DomainError`, never `DomainError` itself, and never Hono's `HTTPException`:
   - `NotFoundError`: the thing the request refers to doesn't exist, or the caller may not see it;
   - `ConflictError`: the current state doesn't allow the operation (a tournament that has already started);
   - `RuleViolationError`: the input is well formed but breaks a rule (too many players for the game).
2. Every domain error is thrown with a specific kebab-case code and a message: a code such as `tournament-already-started`, then the message. Codes are stable, because the frontend uses them as translation keys.
3. The message is written for the client. It must not reveal anything internal: no IDs that aren't the client's own, no table or column names, no SQL, no library messages, no stack traces.
4. Don't add new categories, or HTTP statuses, in services. The category-to-status mapping (404, 409, 422) lives in one place in `service-runtime`.
5. `service-runtime`'s error handler is installed by `createServiceApp()`, which every service's `createApp` starts from, so a service never calls `app.onError` itself. The handler turns a domain error into an `application/problem+json` body with the category's status: `type` is always `about:blank`, `title` is the status's reason phrase, `detail` is the message, and `code` is the error's code. Clients translate `code`, never `type`; `title` and `detail` are English fallbacks. The handler logs a domain error at `debug`, with its code.
6. Any other error is a bug: the error handler logs it in full and returns a generic 500 problem-details body with nothing from the error in it, and the code `internal-error`. So is a `DomainError` subclass a service defines itself, because it has no status (rule 4).
7. Validate every request with `validateRequest(target, schema)` from `service-runtime`, never with `zValidator` from `@hono/zod-validator`, which lint forbids outside `service-runtime`. A failure answers 400 with the same body and the code `invalid-request`, plus an `issues` member listing each issue as `{ path, code, message }`. `path` is the field's path joined with dots, and `code` is zod's own issue code (such as `too_small`), passed through unchanged so the client can translate it. A body that isn't valid JSON answers the same, without `issues`.
8. The service's `AppType` is `WithProblemDetails<ReturnType<typeof createApp>>`, from `service-runtime`, which adds the problem-details body to every route through Hono's `ApplyGlobalResponse`, so the RPC client knows the error body.
9. Don't catch domain errors in handlers in order to return something else. If a handler can carry on after a failure, it isn't a domain error: check the condition instead.
10. In jobs, a domain error completes the job without retrying (see [Background jobs](./background-job.md)).

## Exemplar

- `services/example/src/messaging/get-message/handler.ts`, `getMessage`: a `NotFoundError` thrown with its code and client-facing message when the query finds no row.
- `packages/service-runtime/src/problem-details.ts`, `errorHandler`: the one category-to-status mapping, the problem-details body, and the log levels for domain and unexpected errors.

## Related

- [Signal expected failures with thrown domain errors](../adr/0024-signal-expected-failures-with-thrown-domain-errors.md)
- [Build every service's app from one runtime factory](../adr/0049-build-every-services-app-from-one-runtime-factory.md)
- [Database transactions](./database-transaction.md)
- [Background jobs](./background-job.md)
- [Vertical slices](./vertical-slice.md)
