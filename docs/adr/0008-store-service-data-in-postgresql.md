---
type: adr
status: accepted
date: 2026-11-17
summary: Every service with state keeps it in its own PostgreSQL database, because Postgres also provides durable background jobs and a transactional outbox without extra infrastructure.
tags: [tech-stack, database, data-ownership]
---

# Store service data in PostgreSQL

## Context

Each service owns its data and no service reads another's database (see [Build Arcturus as independent services connected by HTTP](./0001-build-arcturus-as-services-connected-by-http.md)). There is no message broker, so each service also has to make its own work durable: retries, queued callbacks, and the guarantee that a write and the work it triggers are never separated.

The tournament runner, the player gateway and every game service hold state. All of them are TypeScript on Node (see [Write the repository in TypeScript on Node](./0007-write-the-repository-in-typescript-on-node.md)), maintained by one person, so one database technology everywhere is much cheaper than several.

## Decision

We will store every service's data in PostgreSQL, with a separate database for each service. Locally, one Postgres instance holds one database per service.

## Consequences

- One database technology to run, back up, tune and understand.
- Durable background jobs can live in the same database as the domain data, queued in the same transaction, which gives a transactional outbox with no extra infrastructure (see [Run background jobs with graphile-worker](./0012-run-background-jobs-with-graphile-worker.md)).
- `LISTEN/NOTIFY` lets job workers pick up new work with low latency.
- Sharing one Postgres server between services is allowed; reading another service's database is not. Separate databases make that boundary hard to cross by accident.
- Every service needs a Postgres server available, including in tests.

## Alternatives considered

- **SQLite per service:** simpler to run, with no server, but it loses the Postgres-based job queue and its transactional outbox, which is how services make their work durable without a broker.
