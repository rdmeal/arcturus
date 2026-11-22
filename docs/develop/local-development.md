---
type: guide
---

# Local development

How to run Arcturus on your own machine while working on it. Docker Compose runs the infrastructure, and every service runs on your machine in watch mode, so a change to a service restarts it straight away. The reasons are in [Run infrastructure in Compose and services on the host](../adr/0030-run-infrastructure-in-compose-and-services-on-the-host.md).

> **Status:** this describes the setup being built with the first services. Until then, there is nothing to run, and the commands below don't exist yet.

## Before you start

Set up your clone with [Getting started](./getting-started.md), including Docker.

## What runs where

| Where             | What                                                                        |
| ----------------- | --------------------------------------------------------------------------- |
| Docker Compose    | Postgres, with a role, a database and a shadow database for each service    |
| Your machine      | Every service, each in Node's watch mode                                    |
| Vite's dev server | The web frontend, which forwards `/api/*` to the tournament runner          |
| Your browser      | Game replay pages, opened on their game service's own port (its own origin) |

There is no reverse proxy locally.

## Running the stack

1. Start the infrastructure: `vp run infra:up`. It waits until Postgres is healthy.
2. Start every service and the web frontend: `vp run dev`. Each service brings its database up to date with the committed migrations before it starts.
3. Open the web frontend at `http://localhost:5173`.

To run a single service instead, use `vp run --filter <package> dev`. Stop the infrastructure with `vp run infra:down`.

## Configuration

Each service reads its settings from its own folder: a committed `.env.development` with every value it needs locally, and an optional `.env`, which git ignores, for your own overrides. Real environment variables win over both. Nothing in `.env.development` is a secret. How a service loads them is in the [Service composition root](../patterns/service-composition-root.md) pattern.

## Ports

Each service has a fixed port. This table is where ports are allocated: a new service takes the next free port in its range, and its `.env.development` links here.

| What                | Port         |
| ------------------- | ------------ |
| Web frontend (Vite) | 5173         |
| Tournament runner   | 3000         |
| Player gateway      | 3001         |
| Game services       | 3100 upwards |
| Agent services      | 3200 upwards |
| Postgres            | 5432         |

If one of these is already taken on your machine, override the port in that service's `.env`. For Postgres, set it in a `.env` at the repository root, which Compose reads.

## Databases and migrations

- To write a migration, run `vp run --filter <package> db:watch` and edit that service's `migrations/current.sql`. The whole workflow is in the [Database migrations](../patterns/database-migration.md) pattern.
- To rebuild a service's database from its committed migrations, run `vp run --filter <package> db:reset`.
- Postgres creates the roles and databases only when its volume is empty. After a new service with a database is added, either re-run the init script against the running container, or delete the volume with `docker compose down -v` (which deletes every service's local data).
