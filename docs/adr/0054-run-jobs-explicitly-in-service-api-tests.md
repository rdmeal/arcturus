---
type: adr
status: accepted
date: 2026-11-27
summary: Service API tests never start a live job worker; they run queued jobs with runJobs(), which fails the test on any error but a domain error, and the app's readiness checks a test worker the test can stop, so job runs are deterministic and readiness is still tested through the API.
tags: [testing, backend]
---

# Run jobs explicitly in service API tests

## Context

Every outbound call a write causes runs in a background job, queued with graphile-worker in the same transaction as the data (see [Run background jobs with graphile-worker](./0012-run-background-jobs-with-graphile-worker.md)). A service's behaviour is mostly tested by in-process API tests (see [Test services mostly through their API, in-process](./0032-test-services-through-their-api.md)), so most interesting tests queue a job and then need its effect.

In production, a worker in the service's process picks up jobs through `LISTEN/NOTIFY` whenever it gets to them. A test that ran the same way would have to wait for the effect: polling is either slow or flaky, and in the end it needs a "wait until the queue is idle" helper anyway. A job that throws inside a background worker becomes a log line and a retry, so it fails nothing. Each test has its own database (see [Give every test a fresh database from a migrated template](./0035-give-every-test-a-fresh-database-from-a-template.md)), so a live worker means a runner, with its own pool and listening connection, started and stopped for every test. Retries are scheduled with backoff on the database's clock, so a test about retries couldn't reach the next attempt without waiting.

Each service's readiness also checks its worker, so a service whose worker has stopped answers not-ready. API tests should show that the app is wired to that check.

## Decision

We will not start a job worker in service API tests:

- The test harness's `runJobs()` fixture runs the service's queued jobs with graphile-worker's `runOnce`, on the test's database, until none can run now. A test calls it after a command that queues a job, then asserts.
- `runJobs()` fails the test when a job throws anything other than a domain error, naming each failed job and its error. Only a test about retries opts out, with `runJobs({ allowFailures: true })`.
- The app's readiness checks a test worker from the harness's `worker` fixture. It runs no jobs, because `runJobs()` does; it reports itself running until a test calls `stop()`, so a test can show readiness answering not-ready.
- A real worker's own behaviour, such as whether it is running, is tested in `service-runtime`'s own tests with a real graphile-worker runner.

## Consequences

- Job runs are deterministic: no polling, sleeping or waiting in tests.
- A test can see the state between queuing a job and running it, such as a message sent but not yet delivered.
- A broken job fails its test instead of sitting unnoticed in the queue.
- No worker is started for each test's database.
- A test decides when a job runs, so retries need no waiting. A job left to retry isn't run again within the same `runJobs()` call, because its next attempt is scheduled in the future.
- API tests don't exercise graphile-worker's own runner, its `LISTEN/NOTIFY` pick-up or its concurrency. That is the library's code, and the parts this repository wraps (`defineTask`, `createTaskList`, `startWorker`) are tested directly in `service-runtime`.
- The test worker stands in for a lifecycle component, not a neighbouring service, so it doesn't conflict with never faking clients (see [Fake outbound HTTP in tests with MSW](./0033-fake-outbound-http-in-tests-with-msw.md)).

## Alternatives considered

- **A live worker per test, with a helper that waits until the queue is idle:** closer to production, and readiness would check a real worker. It gives up determinism and the state between queuing and running, it needs its own way to turn a job's failure into the test's, and it starts a runner for every test.
- **A test worker that always reports it is running:** simpler, but readiness tests could then never see it stop, so they couldn't show that the app's readiness is wired to its worker.
