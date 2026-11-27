---
type: ticket
status: in-progress
blocked-by: ["04", "07"]
scopes: [arcturus]
---

# 08: A sent message is delivered by a job to the idempotent inbox

Part of [the spec](../spec.md); delivers user stories 2 (readiness: worker), 5, 6, 7, 11 (for jobs), 17 (the network and runJobs fixtures) and 18.

## What to build

- **Queuing:** sending a message now also queues a delivery job, in the same transaction as the message, so neither is committed without the other.
- **Delivering:** the job posts the message to the configured delivery URL through a client in the service's dependencies, outside any transaction, then records when it was delivered.
- **Status:** `GET /messages/get-message` shows whether the message has been delivered.
- **The inbox:** locally, the delivery URL points back at the example service's own `POST /inbox/receive-message`. That endpoint stores what it receives, keyed on the message ID, so a repeated delivery is a no-op that answers success.
- **The worker:** it runs in the same process as the HTTP server, and `/health/ready` checks it. Shutdown stops the worker before the pool ends.
- **Job behaviour:**
  - payloads are validated when a job is queued and when it runs;
  - a domain error in a job is logged as a warning with its code, and the job completes without retrying;
  - any other error is retried with backoff;
  - while a job runs, its log lines carry the job ID, task name and attempt.
- **Tests:**
  - a `network` fixture fakes the delivery endpoint with MSW, through a default handler next to the client, and a mock helper that records what was sent;
  - `runJobs()` runs queued jobs until none can run;
  - a job that throws anything other than a domain error fails the test, unless the test opts in with `{ allowFailures: true }`.

## Acceptance criteria

- [ ] After sending a message and running jobs, the delivery endpoint has received it exactly once, and getting the message shows it as delivered.
- [ ] A send that fails after queuing leaves neither a message nor a job, which proves `addJob` commits and rolls back with the Slonik transaction.
- [ ] Running the delivery job again for a delivered message sends nothing.
- [ ] Posting the same message to the inbox twice answers success both times and stores it once.
- [ ] A payload that doesn't match the task's schema is rejected when queued.
- [ ] A domain error thrown by a job is logged as a warning with its code, and the job doesn't run again. The test asserts this with `captureLogs`.
- [ ] A job that throws an unexpected error fails the test through `runJobs()`. With `{ allowFailures: true }` it doesn't, and the job is left to retry.
- [ ] Log lines written by a job carry its job ID, task name and attempt.
- [ ] `/health/ready` answers not-ready when the worker isn't running.
- [ ] An unhandled outbound request fails the test, because MSW is strict.
- [ ] The exemplars of these patterns name the example service's code: background jobs, service endpoint mocks and idempotent receivers.

## Notes

- **Settled when planning:**
  - how `runJobs` runs graphile-worker's `runOnce` with the service's task list against the test database;
  - what the worker readiness check looks at;
  - the migration that adds the delivered time and the inbox table, which needs its own committed migration.
- **The maintainer adds `DELIVERY_URL` to `.env.development`,** pointing at the example service's own inbox on port 3900.
- **The outbound client is a plain dependency.** Its final form for real services is decided with the protocols, so don't generalise it.
- **Install MSW as a dev dependency only,** after the supply-chain checks.
- **Decisions:**
  - [Run background jobs with graphile-worker](../../../../docs/adr/0012-run-background-jobs-with-graphile-worker.md)
  - [Fake outbound HTTP in tests with MSW](../../../../docs/adr/0033-fake-outbound-http-in-tests-with-msw.md)
  - [Signal expected failures with thrown domain errors](../../../../docs/adr/0024-signal-expected-failures-with-thrown-domain-errors.md)
- **Patterns:**
  - [background jobs](../../../../docs/patterns/background-job.md)
  - [service endpoint mocks](../../../../docs/patterns/service-endpoint-mock.md)
  - [idempotent receivers](../../../../docs/patterns/idempotent-receiver.md)
  - [database transactions](../../../../docs/patterns/database-transaction.md), rule on no outbound calls inside a transaction
