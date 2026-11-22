---
type: adr
status: accepted
date: 2026-11-21
summary: A handler that reads and then changes a match's state first locks the match row with SELECT … FOR UPDATE, so simultaneous actions for one match are processed one after another while different matches run in parallel.
tags: [backend, database]
---

# Serialise work on a match with a row lock

## Context

Game services hold the state of their matches (see [Give game services ownership of their match state](./0002-give-game-services-ownership-of-match-state.md)), and many games have simultaneous turns: in rock-paper-scissors, both players receive a decision request at once. Both may answer within milliseconds, so the player gateway delivers two action callbacks for the same match at the same time.

If those callbacks are handled in parallel, each one reads "waiting for both players", saves its own action, and checks whether both have answered. Each sees only its own action, because the other hasn't committed yet. Neither resolves the turn, and the match hangs. Work on one match has to happen one piece at a time, while different matches still run in parallel.

Services use PostgreSQL at its default READ COMMITTED isolation, and handlers open their transactions explicitly (see [Open database transactions explicitly in handlers](./0022-open-database-transactions-explicitly-in-handlers.md)).

## Decision

We will make every handler that reads a match's state and then changes it begin its transaction by locking the match row with `SELECT … FOR UPDATE`.

More generally, a handler that reads and then writes an aggregate locks the aggregate's root row first. Isolation stays at READ COMMITTED.

## Consequences

- A second action for the same match waits at the lock until the first commits, then reads the updated state and sees both actions. Actions for other matches lock other rows and don't wait.
- It costs one query per handler, with no extra job hop. The callback's response tells the gateway whether the action was handled.
- A slow handler holds up other work on its match, but no other match.
- Forgetting the lock in a new handler brings the race back, so the rule belongs in the patterns, and concurrent tests should cover it.

## Alternatives considered

- **An inbox with serial processing:** the callback only stores the action, and a "process match" job does the work, one job per match at a time. graphile-worker runs jobs in a named queue one at a time, but its documentation warns against high-cardinality queue names such as match IDs: dead queues pile up, degrade performance and need periodic cleanup. It would therefore need a fixed set of bucket queues chosen by hashing the match ID. That adds a job hop per action, lets a slow match hold up the other matches in its bucket, and still needs the lock to be safe. It stays an option for a game whose action processing is slow or expensive.
- **Optimistic locking** with a version column: correct, but every handler needs code to retry on conflict.
- **SERIALIZABLE isolation** with retries: correct, but any transaction can fail and need retrying, and conflicts are harder to reason about.
