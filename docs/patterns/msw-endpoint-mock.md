---
type: pattern
summary: Use when code under test calls another service over HTTP — give each endpoint a default MSW handler next to its client, and override it in the test with a mock<Endpoint>() helper that returns a request recorder when the call is the behaviour.
tags: [backend, testing]
---

# MSW endpoint mocks

Tests fake other services at the network level with MSW, so the service's real clients run in every test. Each endpoint has one default handler and one override helper, so every test fakes a given endpoint the same way.

## When to use it

- Any test whose code calls another service over HTTP through a client in its dependencies: a game service, the player gateway, the tournament runner, a player's endpoint.
- Asserting what was sent to another service, when the outbound call is the behaviour under test.

## When not to

- Never replace a client in the dependencies with a fake object. Fake the endpoint instead, so the client's URL building, parsing and error mapping are tested.
- Never fake the service under test. Its own API is called through the `client` fixture (see [Service API tests](./service-api-test.md)).

## Rules

1. The MSW server comes from the `network` fixture in `packages/service-testing`. It runs with `onUnhandledRequest: 'error'`, so a call with no handler fails the test, and its handlers are reset after every test. Never change that option.
2. Each client's handlers live next to it, in `src/clients/<service>/<service>.handlers.ts`. That file is test-only code: production code never imports it.
3. For every endpoint the client calls, the module exports a default handler that answers with a valid success response built by a [factory](./test-data.md). The module also exports the list of all its defaults, and the service's `network` fixture starts with every client's defaults installed.
4. For every endpoint, the module also exports an override helper named `mock<Endpoint>`, such as `mockStartMatch`. It takes an optional response, or a function from the request to a response, installs a handler with `network.use(...)`, and returns a recorder.
5. The recorder's `requests` holds each request body that endpoint received, in order, parsed with the endpoint's zod request schema. A body that fails to parse fails the test.
6. Default handlers don't record. A test that cares what was sent, or needs a different answer, overrides the endpoint in its body with the `mock<Endpoint>` helper. Never add a recorder to a default.
7. Assert on what was sent only when the call is the behaviour under test, such as "starting a match sends the tournament's game options". Otherwise, assert on what the service does with the answer.
8. To test a failing neighbour, override the endpoint with the failure: an error status with problem details, a malformed body, or a network error with `HttpResponse.error()`. Don't write a separate default for failures.
9. Never call `network.resetHandlers()` or `network.close()` in a test. The fixture handles both.

## Exemplar

None yet: established by the first ticket that uses it.

## Related

- [Fake outbound HTTP in tests with MSW](../adr/0033-fake-outbound-http-in-tests-with-msw.md)
- [Service API tests](./service-api-test.md)
- [Test data factories](./test-data.md): builds the responses.
- [Service composition root](./service-composition-root.md): every outbound call goes through a client in the dependencies.
