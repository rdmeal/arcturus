---
type: adr
status: accepted
date: 2026-11-17
summary: Services write plain SQL through Slonik, which composes queries safely and validates every result row against a zod schema at runtime; its history of breaking releases is accepted as a risk.
tags: [tech-stack, database]
---

# Access PostgreSQL with Slonik

## Context

Services store their data in PostgreSQL (see [Store service data in PostgreSQL](./0008-store-service-data-in-postgresql.md)), and migrations are written as plain SQL (see [Migrate databases with Graphile Migrate](./0013-migrate-databases-with-graphile-migrate.md)). The database layer should therefore let us write SQL directly rather than hide it, while keeping queries safe from injection.

Database rows are a boundary like any other: what comes back may not match the TypeScript type the code assumes, especially after a migration. Every boundary is validated with zod (see [Use zod as the only schema library](./0010-use-zod-as-the-only-schema-library.md)).

Background jobs are queued by calling a SQL function inside the same transaction as the domain write (see [Run background jobs with graphile-worker](./0012-run-background-jobs-with-graphile-worker.md)), so the database layer must let arbitrary SQL run inside its transactions.

## Decision

We will access PostgreSQL through Slonik, writing SQL in its tagged templates and validating result rows with zod schemas (`sql.type(schema)`).

## Consequences

- Queries are explicit SQL, composed safely, with no query builder or ORM between the code and the database.
- Every row is checked against its schema at runtime, so a drift between the database and the code fails loudly at the boundary.
- Slonik is framework-agnostic: the connection pool is created in the service's composition root and passed to the code that needs it.
- Jobs can be queued with plain SQL inside a Slonik transaction.
- Row schemas are written by hand, so they can drift from the tables until a query fails. Generating them from the migrated schema may be worth trying later.
- Slonik has a single main maintainer and a history of breaking major releases. We accept this risk and pin its version, upgrading deliberately.

## Alternatives considered

- **Kysely:** a type-safe query builder, popular and well maintained, with types generated from the database schema. Rejected because it doesn't validate rows at runtime and puts a builder between the code and the SQL.
- **postgres.js or plain `pg`:** minimal and well known, but with no row validation; we would rebuild part of Slonik on top.
- **Drizzle or Prisma:** schema-first ORMs that generate SQL from a TypeScript schema, which clashes with writing migrations and queries as plain SQL.
