---
type: adr
status: accepted
date: 2026-11-22
summary: Each service's config.ts is the only code that knows where configuration comes from. It loads a committed .env.development and an optional git-ignored .env with dotenv into a plain object, lets real environment variables win, and returns validated config, so a service runs straight after a clone and production needs no special case.
tags: [backend, local-development]
---

# Load configuration only in each service's config module

## Context

Every service parses its configuration once at startup with one zod schema, and secrets come from environment variables or mounted files, never from a config file (see [Use zod as the only schema library](./0010-use-zod-as-the-only-schema-library.md)). Every value that differs between environments comes from environment variables, or, for the tournament runner, from the operator config file, so a hosted environment can be added later without code changes.

Locally, services run on the host (see [Run infrastructure in Compose and services on the host](./0030-run-infrastructure-in-compose-and-services-on-the-host.md)), and each needs values before it can start: its port, its database URL, and the URLs Graphile Migrate uses (see [Migrate databases with Graphile Migrate](./0013-migrate-databases-with-graphile-migrate.md)). None of these are real secrets: the local database password is thrown away with the container. A contributor should be able to clone the repository and start everything without copying or filling in files.

Env files can be loaded in three places: by whatever launches the process (Node's `--env-file-if-exists` flag in the `dev` script), by `main.ts`, or by the module that defines the configuration. Each spreads the knowledge of where configuration comes from differently.

## Decision

We will load and validate configuration only in each service's `src/config.ts`:

- **`config.ts` is the only code that knows where configuration comes from.** It exports `loadConfig()`, which reads the env files and the environment (and, for the tournament runner, the operator config file), validates them with the service's zod schema, and returns a typed, frozen config. It also exports a pure `parseConfig(source)`, so tests never touch files or `process.env`. `main.ts` calls `loadConfig()` once. No other file reads `process.env`, an env file or the config file.
- **Env files are loaded with dotenv, into a plain object** (`processEnv: {}`, `quiet: true`), never into `process.env`. `loadConfig()` then validates the file values with real environment variables laid over them.
- **Precedence:** real environment variables, then a git-ignored `.env` for personal overrides, then a committed `.env.development` of non-secret local values. Every value a service needs locally, including the path to an example operator config, is in `.env.development`, so the service runs straight after a clone.
- **The files are found relative to the service's package folder** (`import.meta.dirname`), not the working directory.
- **Missing files are skipped, and there is no check on `NODE_ENV`.** The same code runs in every environment.
- **Required settings have no defaults in the schema.** A deployment that forgets one fails at startup, rather than falling back to a local value.

## Consequences

- A fresh clone runs with no setup step, and committed local values can't drift from a copied example file.
- The rest of a service never knows whether a value came from a file, the environment or the operator config, so the source can change without touching it.
- `process.env` is never changed, so no library can come to depend on a value that only exists locally.
- Production is safe without a special case only if production images contain no env files. The image build has to exclude them. If it doesn't, real environment variables still win, but a setting the deployment forgot would be filled from a local file.
- `.env.development` must never hold a real secret. Its values are committed and readable by anyone.
- Tools that read the environment themselves, such as Graphile Migrate's command-line tool, don't go through `loadConfig()`. They are run through `dotenv run` with the same files in the same order, so the file names are written in two places.
- dotenv is a runtime dependency of every service that has config.

## Alternatives considered

- **Node's `--env-file-if-exists` flag in each `dev` script:** built in, with no dependency, but it puts the knowledge of where configuration comes from in the launch script, outside `config.ts`.
- **Node's `process.loadEnvFile()`:** built in, but it writes into `process.env` and throws when a file is missing.
- **A committed `.env.example` copied to `.env` by hand:** the most common convention, but it adds a setup step, and the copies drift from the example.
- **Loading env files only when `NODE_ENV` is `development`:** a second guard, but it introduces a variable nothing else uses, and forgetting to set it gives the local behaviour anyway.
- **Defaults for local values in the zod schema:** no file needed, but a production deployment that forgets a setting would start quietly with a local value, such as the example operator config.
