---
type: guide
---

# Codebase

Where code lives in this repository, and what may import what. How the running parts fit together is in [Architecture](../ARCHITECTURE.md).

## Layout

Every package has its own `package.json` and declares everything it imports ([Organise the repository as pnpm package-based workspaces](../adr/0016-organise-the-repository-as-pnpm-workspaces.md)). Every package also has a `README.md`; what it holds is in [Writing docs](./writing-docs.md#package-readmes).

| Folder                 | What it holds                                                   |
| ---------------------- | --------------------------------------------------------------- |
| `apps/web`             | The web frontend                                                |
| `services/<service>`   | A platform service: the tournament runner or the player gateway |
| `packages/<name>`      | Shared libraries that services and games import                 |
| `games/<game>/service` | A core game's game service                                      |
| `games/<game>/agents`  | One service hosting all of that game's core agents              |
| `tools/<name>`         | Repo tooling: CI helpers, repo checks, lint rules, generators   |

## What may import what

- **Services and games** import from `packages/` only, never from each other.
- **Core games and agents** use only the game protocol and player protocol, never platform internals, just as an author's would ([Extend Arcturus only through published protocols](../adr/0004-extend-arcturus-through-published-protocols.md)).
- **`tools/`** is never imported by services or games.
- **Production code** never imports test-only code or test libraries. Where test-only code lives is in [Service API tests](../patterns/service-api-test.md), and how lint enforces this is in [Linting](./linting.md).

## Inside a service

Every service has the same shape: vertical slices in `src/<area>/<slice>/`, one per command, query or job, behind a task-based API (`POST` commands, `GET` queries, at `/<area>/<slice>`); dependencies wired by hand in `main.ts`; lifecycle and health checks from a shared `service-runtime` package. How to write each part is in [`patterns/`](../patterns/), and the reasons in [Structure services as vertical slices with a task-based API](../adr/0021-structure-services-as-vertical-slices.md) and the ADRs that follow it.

Two packages are shared by every service:

- **`packages/service-runtime`** (`@arcturus/service-runtime`): server start-up, graceful shutdown, health checks, the logger, settings parsing and the telemetry entry point.
- **`packages/service-testing`** (`@arcturus/service-testing`): the test harness that API tests are built on. It is only ever a dev dependency.

`services/example` is a temporary example service. It sets the patterns' exemplars until real services replace it.
