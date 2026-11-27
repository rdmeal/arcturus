---
type: pattern
summary: Use when code under test calls another service over HTTP — give each endpoint a default MSW handler next to its client, and override it in the test with a mock<Endpoint>() helper that returns a request recorder when the call is the behaviour.
tags: [backend, testing]
---

# Service endpoint mocks

Tests fake other services at the network level with MSW, so the service's real clients run in every test. Each endpoint has one default handler and one override helper, so every test fakes a given endpoint the same way.

## When to use it

- Any test whose code calls another service over HTTP through a client in its dependencies: a game service, the player gateway, the tournament runner, a player's endpoint.
- Asserting what was sent to another service, when the outbound call is the behaviour under test.

## When not to

- Never replace a client in the dependencies with a fake object. Fake the endpoint instead, so the client's URL building, parsing and error mapping are tested.
- Never fake the service under test. Its own API is called through the `client` fixture (see [Service API tests](./service-api-test.md)).

## Rules

1. The MSW server comes from the `network` fixture in `packages/service-testing`. It runs with `onUnhandledFrame: 'error'` (MSW 3's name for strict mode), so a call with no handler fails the test, and its handlers are reset after every test. The fixture is installed for every test, so a test that never asks for `network` meets the strict server too. Never change that option.
2. Each client lives in `src/clients/<service>/<service>.ts`, and its handlers next to it, in `src/clients/<service>/<service>.handlers.ts`. The handlers file is test-only code: production code never imports it.
3. For every endpoint the client calls, the module exports a default handler, `<endpoint>Handler`, that answers with a valid success response built by a [factory](./service-test-data.md). An endpoint that answers with no body, such as a 204, needs no factory. The module also exports the list of all its defaults, `<service>Handlers`, and the service's `src/test/test.ts` passes every client's defaults to `createServiceTest` as `handlers`.
4. For every endpoint, the module also exports an override helper named `mock<Endpoint>`, such as `mockStartMatch`. It takes the `network` fixture and an optional function from the parsed request body to a response, installs a handler with `network.use(...)`, and returns a recorder. Without the function, it answers as the default does. It takes a function rather than a response because MSW reads a response's body only once, so an answer given to more than one request has to be built for each.
5. The recorder's `requests` holds each request body that endpoint received, in order, parsed with the endpoint's zod request schema. A body that fails to parse fails the test.
6. Default handlers don't record. A test that cares what was sent, or needs a different answer, overrides the endpoint in its body with the `mock<Endpoint>` helper. Never add a recorder to a default.
7. Assert on what was sent only when the call is the behaviour under test, such as "starting a match sends the tournament's game options". Otherwise, assert on what the service does with the answer.
8. To test a failing neighbour, override the endpoint with the failure: an error status with problem details, a malformed body, or a network error with `HttpResponse.error()`. Don't write a separate default for failures.
9. Never call `network.resetHandlers()` or `network.close()` in a test. The fixture handles both.

## Exemplar

- `services/example/src/clients/inbox/inbox.handlers.ts`, `receiveMessageHandler`, `inboxHandlers` and `mockReceiveMessage`: a default answering 204 for any host, the list of defaults, and an override that records each parsed request body.
- `services/example/src/messaging/deliver-message/deliver-message.test.ts`: the recorder asserted where the call is the behaviour, and overrides answering with problem details from a factory to test a rejecting and a failing neighbour.

## Related

- [Fake outbound HTTP in tests with MSW](../adr/0033-fake-outbound-http-in-tests-with-msw.md)
- [Service API tests](./service-api-test.md)
- [Service test data factories](./service-test-data.md): builds the responses.
- [Service composition root](./service-composition-root.md): every outbound call goes through a client in the dependencies.
