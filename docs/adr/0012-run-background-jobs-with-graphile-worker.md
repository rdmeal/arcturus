---
type: adr
status: accepted
date: 2026-11-17
summary: Each service queues durable background jobs with graphile-worker in its own database, in the same transaction as the data they belong to, which delivers at-least-once callbacks with retries and backoff without a message broker.
tags: [tech-stack, database, integration]
---

# Run background jobs with graphile-worker

## Context

Services talk only over HTTP, long-running work is completed by callbacks delivered at least once, and there is no message broker: each service makes its own work durable (see [Build Arcturus as independent services connected by HTTP](./0001-build-arcturus-as-services-connected-by-http.md)). That needs a job queue inside each service, with retries and backoff, that survives restarts.

The hard part is atomicity. If a service writes domain data and then queues the callback separately, a crash in between either loses the callback or sends one for data that was never saved. The job has to be queued in the same transaction as the data.

Every service already has its own PostgreSQL database (see [Store service data in PostgreSQL](./0008-store-service-data-in-postgresql.md)) and writes SQL through Slonik (see [Access PostgreSQL with Slonik](./0011-access-postgresql-with-slonik.md)).

## Decision

We will use graphile-worker, in each service's own database, for durable background jobs. Jobs are queued by calling `graphile_worker.add_job()` inside the same transaction that writes the domain data.

## Consequences

- A transactional outbox: domain data is never committed without its job, or the reverse.
- Retries, backoff and scheduled jobs come from the library rather than our own code.
- `LISTEN/NOTIFY` means new jobs are picked up with low latency, without polling.
- No new infrastructure: the queue lives in the database the service already has, in a `graphile_worker` schema that the library creates and migrates itself.
- Job payloads are stored as JSON, so they are a boundary and are validated when read back. No framework types them, so a small typed mapping from job name to schema to handler is needed.
- Workers must be shut down gracefully along with the service.
- Trace context does not cross a job automatically; it has to be carried in the payload if traces should continue through asynchronous steps.

## Alternatives considered

- **pg-boss:** also a Postgres-based queue, and a reasonable choice. graphile-worker's SQL-level `add_job` fits queuing inside a Slonik transaction more directly, and it picks up jobs through `LISTEN/NOTIFY`.
- **A message broker** (Kafka, NATS JetStream, Redis Streams): already rejected for communication between services in [Build Arcturus as independent services connected by HTTP](./0001-build-arcturus-as-services-connected-by-http.md), and it would add infrastructure for work that stays inside one service.
