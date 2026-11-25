# @arcturus/example-service

A temporary example service with a small message domain: its `messaging` area sends a message (`POST /messaging/send-message`) and reads it back (`GET /messaging/get-message`). It proves the shared runtime, the test harness and the patterns in a real package, and holds the patterns' exemplars until real services replace it. It will then be deleted.

It's built like every service: see the [service composition root](../../docs/patterns/service-composition-root.md) pattern.

## Running it

Start Postgres first with `vp run infra:up`. Then, from the repository root, `vp run --filter @arcturus/example-service dev` migrates its database and starts it with file watching on port 3900, reading `.env.development`, which sets `DATABASE_URL` to its local database. The `start` script starts it without migrating or watching.

Its database scripts (`db:watch`, `db:reset`, `db:commit` and `db:uncommit`) are described in the [database migration](../../docs/patterns/database-migration.md) pattern.

## Testing

From the repository root, with Docker running, `vp test services/example`. Each test gets its own database, cloned from the service's migrated template.
