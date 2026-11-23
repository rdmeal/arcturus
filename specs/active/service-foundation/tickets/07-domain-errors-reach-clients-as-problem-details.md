---
type: ticket
status: ready
blocked-by: ["06"]
scopes: [arcturus]
---

# 07: Domain errors reach clients as problem details

Part of [the spec](../spec.md); delivers user story 8.

## What to build

A client of any service gets every failure as RFC 9457 problem details:

- **Expected failures:** a handler throws a domain error category with a kebab-case code, and the client gets the matching status with that code. In the example service, getting a message that doesn't exist answers not-found.
- **Invalid requests:** a request that fails validation gets problem details too.
- **Unexpected errors:** an unexpected error answers 500 with a body that reveals nothing internal, and it is logged as an error.
- **Logging:** domain errors over HTTP are logged at `debug` only.
- **Types:** the error responses are declared once for every route, so the typed client knows them.

## Acceptance criteria

- [ ] Getting an unknown message ID answers `404` problem details with the not-found code.
- [ ] A send request with an invalid body answers `400` problem details.
- [ ] An unexpected error answers `500` problem details with no message, stack or internal detail, and is logged at `error` with the cause.
- [ ] A domain error over HTTP is logged at `debug` and at no higher level.
- [ ] A domain error thrown inside a transaction rolls the transaction back: nothing it wrote is visible afterwards.
- [ ] The typed client sees the error responses on every route.
- [ ] The error handling pattern's exemplar names the example service's not-found case and the runtime's error handler.

## Notes

- **Settled when planning:**
  - the exact categories and their statuses, following [Signal expected failures with thrown domain errors](../../../../docs/adr/0024-signal-expected-failures-with-thrown-domain-errors.md);
  - how the rollback case is triggered in a test without a contrived slice;
  - how validation failures from `@hono/zod-validator` become problem details.
- **Patterns:** [error handling](../../../../docs/patterns/error-handling.md), [observability](../../../../docs/patterns/observability.md) rule 4.
