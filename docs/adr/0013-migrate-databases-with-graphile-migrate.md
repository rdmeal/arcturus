---
type: adr
status: accepted
date: 2026-11-17
summary: Database migrations are plain SQL, forward-only and hash-chained, managed with Graphile Migrate, which installs through npm so the TypeScript-only repository needs no JVM.
tags: [tech-stack, database]
---

# Migrate databases with Graphile Migrate

## Context

Each service has its own PostgreSQL database (see [Store service data in PostgreSQL](./0008-store-service-data-in-postgresql.md)) and writes plain SQL through Slonik (see [Access PostgreSQL with Slonik](./0011-access-postgresql-with-slonik.md)), so migrations should be plain SQL too.

We want migrations to be forward-only: once applied, a migration is never rolled back or edited, and any change is a new migration. A tool where rollback exists, or where applied migrations can be edited silently, makes that a convention rather than a guarantee.

The previous setup used Flyway, a JVM tool, and an earlier plan kept it, partly because games in other languages would need a language-neutral tool. Since then the repository has become TypeScript-only (see [Write the repository in TypeScript on Node](./0007-write-the-repository-in-typescript-on-node.md)), so that reason no longer applies, and removing the JVM from the stack has become worth more.

## Decision

We will manage each service's database migrations with Graphile Migrate: plain SQL migrations, forward-only, with each committed migration hash-chained to the one before it.

## Consequences

- No JVM or separate migration image: the tool is an npm dependency, pinned in the lockfile, and callable from Node, including from test setup.
- Forward-only is built in: there are no down migrations, and editing a committed migration breaks the hash chain, so tampering is detected.
- During development, the migration in progress lives in `current.sql`, which is re-applied to the development database on every save and committed once finished. It must therefore be safe to run repeatedly, which is a change of habit.
- The development workflow uses a shadow database, so it needs a connection that is allowed to create and drop that database.
- It is from the same author as graphile-worker, which creates and migrates its own schema alongside (see [Run background jobs with graphile-worker](./0012-run-background-jobs-with-graphile-worker.md)).
- How migrations run in local development and in tests is decided with those environments.

## Alternatives considered

- **Flyway** (the previous setup): proven, plain SQL, forward-only with checksums in its Community edition. Rejected because it brings a JVM or a separate Docker step into a TypeScript-only repository, and its language-neutral advantage no longer matters.
- **dbmate:** plain SQL and installable through npm, but not forward-only by design (a rollback command always exists) and, as far as we know, without checksum validation.
- **postgrator:** close to Flyway's model with checksums, but it has undo migrations.
- **node-pg-migrate:** migrations written in JavaScript rather than SQL.
- **Drizzle Kit or Prisma Migrate:** generate SQL from a TypeScript schema, the opposite of writing SQL first.
