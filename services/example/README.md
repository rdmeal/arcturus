# @arcturus/example-service

A temporary example service with a small message domain. It proves the shared runtime, the test harness and the patterns in a real package, and holds the patterns' exemplars until real services replace it. It will then be deleted.

It's built like every service: see the [service composition root](../../docs/patterns/service-composition-root.md) pattern.

## Running it

From this folder, `pnpm run dev` starts it with file watching on port 3900, reading `.env.development`. `pnpm run start` starts it without watching.

## Testing

From the repository root, `vp test services/example`.
