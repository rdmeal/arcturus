---
type: pattern
summary: Use when a test needs an object (a request body, a faked response, a game state) — build it with a fishery factory and override only the fields the test is about.
tags: [backend, testing]
---

# Test data factories

Every object a test needs comes from a fishery factory that gives a valid default for every field. The test overrides only the fields it is about, so what matters to it stands out, and a change to a type is fixed once, in its factory.

## When to use it

- Request bodies sent to the service under test, including through arrange helpers.
- Responses returned by MSW handlers.
- Inputs to pure functions in unit tests, such as a game state for a rule test.

## When not to

- When building the object is what the test is about, such as a test of a parsing function. Write the input out in the test, so the test shows what it checks.
- For storing data. Factories only build objects in memory. Store data through the service's API, or the direct database escape hatch (see [Service API tests](./service-api-test.md)).

## Rules

1. One factory per type, in the service's `src/test/factories/<type>.factory.ts`, exported as `<type>Factory`, such as `tournamentFactory` in `tournament.factory.ts`. Protocol payloads a service sends or receives have their factories in that service for now.
2. Type every factory with the zod-inferred type of what it builds (`Factory<z.infer<typeof schema>>`, or the exported type), so its defaults are checked against the schema.
3. Every default is valid and fixed, readable rather than random, such as `name: "Test tournament"`. Use fishery's `sequence` for values that must be unique, such as names, and a fresh UUID for IDs. Never use random data generators such as faker.
4. Each call builds a new object. Never keep a built object in a module-level constant, and never share one between tests.
5. A test overrides only the fields it is about: `tournamentFactory.build({ name: "Spring cup" })`. Overrides are deep-merged, so pass only the nested field that matters. Arrays are replaced, not merged.
6. A variant that recurs gets a named method on the factory, by subclassing fishery's `Factory` as its documentation shows, such as `tournamentFactory.running()`. Don't repeat the same overrides across tests.
7. Use transient params for inputs that shape an object without being fields on it, such as a number of seats, and `buildList(n)` for several objects.
8. A factory for a type that contains another uses that type's factory for the default, so the nested default is fixed in one place.
9. Never use fishery's `create()` or `onCreate`. Factories don't store anything.
10. Never put test data in migrations or a shared seed. Each test builds its own.

## Exemplar

None yet: established by the first ticket that uses it.

## Related

- [Build test data with fishery factories](../adr/0036-build-test-data-with-fishery-factories.md)
- [Give every test a fresh database from a migrated template](../adr/0035-give-every-test-a-fresh-database-from-a-template.md): why there is no seed data.
- [Service API tests](./service-api-test.md)
- [MSW endpoint mocks](./msw-endpoint-mock.md)
