---
type: adr
status: accepted
date: 2026-11-21
summary: Handlers throw a small set of domain error categories with specific codes, which one error handler maps to RFC 9457 problem details that reveal nothing internal, because this is idiomatic in TypeScript and Hono, rolls transactions back for free, and suits how TanStack Query handles errors.
tags: [backend]
---

# Signal expected failures with thrown domain errors

## Context

Handlers regularly hit failures that are expected rather than bugs: a tournament that doesn't exist, a tournament that has already started, an input that breaks a rule. These failures have to reach HTTP clients as a status and a body, and job handlers have to tell them apart from failures worth retrying.

Several forces apply:

- **Rollback.** Slonik rolls a transaction back only when its callback throws (see [Open database transactions explicitly in handlers](./0022-open-database-transactions-explicitly-in-handlers.md)). A failure that is returned as a value after a write leaves that write committed.
- **Hono's approach.** Hono's documented error handling is to throw (`HTTPException`) and map the error in one `app.onError`. Its RPC client only infers statuses that a handler returns, not thrown ones, but `ApplyGlobalResponse` can declare one global error shape for every route.
- **The frontend.** TanStack Query signals failure by throwing from the query function, and Hono's `parseResponse()` throws a `DetailedError` for any non-OK response (see [Build the frontend as a React single-page app](./0014-build-the-frontend-as-a-react-spa.md)). On the frontend every error ends up thrown, so what matters is one consistent error body with a machine-readable code that can become a translation key (see [Set up translations from the start](./0015-set-up-translations-from-the-start.md)).
- **Jobs.** Job handlers have no HTTP context, so handlers shouldn't know about status codes.
- **Security.** Error bodies must not reveal how a service works inside.

## Decision

We will signal expected failures by throwing domain errors.

- There is one `DomainError` base class with a small set of category subclasses: `NotFoundError`, `ConflictError` (the current state doesn't allow the operation) and `RuleViolationError` (the input is well formed but breaks a rule). Each error is thrown with a specific kebab-case code and a message written for the client.
- One `app.onError` per service maps each category to a status (404, 409, 422) and returns an RFC 9457 problem details body (`application/problem+json`) with a `code` member. Request validation failures use the same shape. The shape is declared to the RPC client with `ApplyGlobalResponse`.
- Any other error is a bug. It is logged, and the client gets a generic 500 with no stack trace, SQL, library message or internal detail.
- Handlers never throw Hono's `HTTPException`.
- In a job, a domain error is logged and the job completes without retrying, because its input can never succeed. Any other error is retried.

## Consequences

- A thrown domain error inside a transaction rolls it back, with no extra machinery.
- What a handler can fail with isn't visible in its type, and per-route error statuses aren't in the RPC client's types. Only the global problem-details shape is. We accept this because the frontend handles every error the same way.
- The frontend can switch on `code` and show a translated message.
- Problem details is the HTTP standard for error bodies, so it's familiar to outside authors if the published protocols adopt it. That choice is made with the protocols.
- Domain error messages reach clients, so they must be written as client-facing text.

## Alternatives considered

- **Returned discriminated unions** (`{ ok: false, reason }`), with a helper that turns a rejection inside a transaction into a rollback: exhaustive, per-route error types. Rejected as not idiomatic for TypeScript or Hono, because it needs extra machinery for rollback, and because the frontend throws anyway.
- **neverthrow or Effect:** the same idea as returned unions, plus a dependency and a functional style. Neither is specific to Hono.
- **A class per specific error:** multiplies classes, each still mapped to a status.
- **A single `DomainError` with a status field:** puts HTTP back into handlers that jobs also use.
- **A home-grown `{ error: { code, message } }` body:** simpler, but non-standard.
