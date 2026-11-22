---
type: adr
status: accepted
date: 2026-11-22
summary: Locally, Docker Compose runs only infrastructure (Postgres, later observability), while every TypeScript service and the web frontend run on the host in watch mode, with no development images and no reverse proxy, because with no build step this gives the fastest feedback for the least to maintain.
tags: [tooling, local-development]
---

# Run infrastructure in Compose and services on the host

## Context

A working local installation has many processes: the tournament runner, the player gateway, a game service and an agent service per core game, and the web frontend. It also needs Postgres, with one database per service (see [Store service data in PostgreSQL](./0008-store-service-data-in-postgresql.md)), and later an observability backend. There is no hosting provider or non-local environment yet.

Services run from their TypeScript source with no build step (see [Run TypeScript source directly](./0018-run-typescript-source-directly.md)), so on the host a service is just `node --watch src/main.ts`. Vite+ runs every package's `dev` task at once with `vp run -r --parallel dev` (see [Build, test, lint and format with Vite+](./0017-build-test-lint-and-format-with-vite-plus.md)). Contributors already need `vp` on the host to run the checks.

Two origin rules apply locally as well as in production. The web frontend calls the tournament runner's `/api` on its own origin, and game replay pages need a separate origin from the main app (see [Show replays from game pages on a separate origin](./0006-show-replays-from-game-pages-on-a-separate-origin.md)).

The repository has one maintainer, so every setup kept in step with the lockfile and the production setup is a real cost.

## Decision

We will run only infrastructure in Docker Compose locally, and every TypeScript service on the host:

- **Compose** (`compose.yaml` at the repository root) runs Postgres now, and the observability backend once it is chosen. It runs none of our own code.
- **Every service** runs on the host in watch mode. `vp run dev` starts them all, and `vp run --filter <package> dev` starts one.
- **The web frontend** runs on Vite's dev server. Vite's `server.proxy` sends `/api/*` to the tournament runner, so the browser sees one origin, as it will in production.
- **Game replay pages** are reached on the game service's own port. A different port is already a different origin, so replay pages are isolated from the main app locally without a separate host name.
- **There are no development Dockerfiles and no local reverse proxy.**

## Consequences

- Feedback is as fast as Node's watch mode and Vite's hot reload. Debuggers and editors attach to services directly.
- No development images need to be kept in step with the lockfile. Nothing in a container has to reach a process on the host.
- Each service needs a fixed local port, kept in one table in the local development guide.
- Locally, nothing checks the production rules for what the reverse proxy exposes (replay pages and their assets only, never game service APIs). They are tested through a full-stack Compose built from the production images, when those exist.
- The local setup differs from production: no containers for our code and no proxy. Problems that only show up in images, such as files missing from an image, are found later, by the full-stack Compose and in CI.
- End-to-end tests and operators need the full stack in containers. That waits for the production images, so Dockerfiles are written once, for production.

## Alternatives considered

- **Everything in Compose with `docker compose watch`:** closer to production, but each kind of service needs a development image, the pnpm workspace's `node_modules` has to be handled inside containers, restarts are slower, and every source change is synced into a container.
- **Both ways, switched with Compose profiles:** the most flexible, but two setups to maintain.
- **A Caddy reverse proxy locally, with `*.localhost` origins:** reproduces production's routing, but Vite's proxy and separate ports already give the same-origin API and the separate replay origin. The proxy would also need containers to reach services on the host.
