---
type: adr
status: accepted
date: 2026-11-22
summary: Tests start their own Postgres with Testcontainers instead of using the Compose database, so `vp test` needs no running infrastructure, never touches development data and needs only Docker in CI.
tags: [testing, database]
---

# Run test databases in Testcontainers

## Context

API tests run against a real PostgreSQL database (see [Test services mostly through their API, in-process](./0032-test-services-through-their-api.md)). Locally, Docker Compose already runs a Postgres server with a database for each service (see [Run infrastructure in Compose and services on the host](./0030-run-infrastructure-in-compose-and-services-on-the-host.md)). In CI, GitHub Actions could provide one as a service container.

Tests that use the Compose server depend on someone having started it, and share a server with the development databases a contributor is working in. CI would need its own way of providing Postgres, so the two setups would differ.

[Testcontainers](https://node.testcontainers.org/) starts throwaway containers from test code, with a `@testcontainers/postgresql` module. Vitest's `globalSetup` runs once before the test workers start and can `provide` connection details to them. Testcontainers for Node was at version 12 in November 2026.

## Decision

We will start Postgres for tests with `@testcontainers/postgresql`, from Vitest's `globalSetup`: one container for each `vp test` run, shared by every service's tests, each service with its own databases on it. Tests never use the Compose Postgres.

## Consequences

- `vp test` works straight after a clone, with Docker running and nothing else started, and never touches development data.
- CI and local runs start Postgres the same way. CI needs Docker, which GitHub's hosted runners have.
- Each run pays a few seconds to start the container. Watch mode starts it once. Reusing a container across runs is possible later with Testcontainers' `withReuse()`.
- The Postgres image is pinned by digest (see [Guard the dependency supply chain](./0020-guard-the-dependency-supply-chain.md)), and Compose and the tests must use the same one, so the image reference has a single home.
- Tests that touch the database need access to the Docker socket. Claude Code's sandbox blocks it, so those tests are run outside the sandbox.

## Alternatives considered

- **The Compose Postgres locally, and a Postgres service container in CI:** no start-up cost, but tests depend on the infrastructure being up, share a server with development data, and CI and local runs differ.
- **A container for each service's tests:** stronger separation, but several seconds of start-up for each service, multiplied across CI shards, for no benefit when every service already has its own databases.
