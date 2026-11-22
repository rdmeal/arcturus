---
type: adr
status: accepted
date: 2026-11-22
summary: Tests fake every outbound call at the network level with MSW in strict mode, so the real clients are tested, a test can record what was sent, and the frontend uses the same tool.
tags: [testing, tooling]
---

# Fake outbound HTTP in tests with MSW

## Context

Services talk to each other only over HTTP (see [Build Arcturus as independent services connected by HTTP](./0001-build-arcturus-as-services-connected-by-http.md)). Every outbound call goes through a client passed in the service's dependencies, which builds the URL, parses the response with zod and maps errors. A service's API tests (see [Test services mostly through their API, in-process](./0032-test-services-through-their-api.md)) need its neighbours to answer without running them.

The client code is where much of a service's integration can go wrong, so faking the client object itself would leave it untested. For a backend, the outbound call is often the behaviour under test: "starting a match sends the tournament's game options" is checked by looking at what was sent.

[MSW](https://mswjs.io/) intercepts requests at the network level, in Node with `setupServer` from `msw/node` and in the browser with a service worker. MSW 3 was current in November 2026. The frontend's tests are expected to fake the tournament runner's API the same way.

## Decision

We will fake every outbound HTTP call in tests with MSW:

- The MSW server runs with `onUnhandledRequest: 'error'`, so a call with no handler fails the test, and handlers are reset after each test.
- Each endpoint a service calls has a default handler that answers with a valid success response. A test overrides an endpoint for its own case.
- When the outbound call is the behaviour under test, the override records each request body, parsed with the endpoint's schema, for the test to assert on. Default handlers don't record.
- The clients in a service's dependencies are never replaced by fakes in tests.

## Consequences

- The real clients run in every test, so URL building, response parsing and error mapping are covered.
- A call nobody expected fails loudly instead of going to the network or returning nothing.
- MSW's docs advise against asserting on requests, in favour of checking what the app does with the response. That advice suits UIs. Here, recording what was sent is a deliberate exception, used only where the call is the behaviour.
- The MSW server is shared by every test in a worker, so tests within one file can't run concurrently without scoping handlers with `server.boundary()`. Tests in a file run in order.
- Default handlers have to be kept in step with the real endpoints. Whether the protocol packages publish handlers for game and player authors is decided with the protocols.
- Frontend and backend tests share one mocking tool and one way of writing handlers.

## Alternatives considered

- **Fake client objects in the dependencies:** simple, but the real client code goes untested, and it differs from how the frontend fakes its API.
- **Running the real neighbouring services in tests:** the most realistic, but a test of one service would need the others' databases and set-up, which is end-to-end testing.
- **A `vi.fn()` spy inside each handler, or MSW's `request:start` events, for recording requests:** spies are ad hoc, so each test would write its own; the events are global and untyped. A typed recorder returned by the override is clearer.
