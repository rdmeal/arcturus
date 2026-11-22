---
paths:
  - "**/*.test.ts"
  - "**/src/test/**"
  - "**/*.handlers.ts"
---

# Tests

Follow [Service API tests](../../docs/patterns/service-api-test.md), [MSW endpoint mocks](../../docs/patterns/msw-endpoint-mock.md) and [Test data factories](../../docs/patterns/test-data.md).

- Arrange state through the service's API and assert through what it exposes. Reaching for the database is not a shortcut.
- Never add a disable comment for the `direct-db` import restriction without a reason saying why the API route doesn't work for this test.
