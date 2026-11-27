---
type: pattern
summary: Use when handling a callback or request that may be delivered more than once — key the write on the incoming ID so a duplicate is a no-op that answers success.
tags: [backend, database]
---

# Idempotent receivers

Calls between services are delivered at least once, so the same callback can arrive twice. A receiver makes a duplicate harmless through its own data, not through a separate record of messages it has seen.

## When to use it

- Any endpoint called by another service's job: action callbacks to a game service, match results and timeout reports to the tournament runner, decision requests to the player gateway.
- Job handlers, which can also run more than once.

## Rules

1. Every at-least-once call carries an ID chosen by its sender, such as a request ID or a match ID. The receiver keys its write on that ID.
2. The table holding the effect has a unique constraint on that ID, or uses it as its primary key when each row is one received call. The write uses `INSERT … ON CONFLICT DO NOTHING`, or checks the row's current state first (has this decision request already been answered?), in the same transaction as the rest of the effect.
3. A duplicate is a no-op that answers with the same success status as the first delivery, so the sender's job stops retrying. It is not an error.
4. Side effects of the first delivery, such as queued jobs, happen only when the write actually happened. Queue them in the same transaction, after the insert or state check shows the call is new.
5. Don't keep a generic table of processed message IDs. Idempotency comes from the data the call changes.
6. A call that is not a duplicate but arrives too late (a request ID already closed, a deadline already passed) is a domain error, not a silent success (see [Error handling](./error-handling.md)).

## Exemplar

- `services/example/src/inbox/receive-message/`, `receiveMessage` and `insertReceivedMessage`: the inbox keyed on the sent message's ID, written with `insert … on conflict (id) do nothing`, answering 204 to a repeat.
- `services/example/src/messaging/deliver-message/handler.ts`, `deliverMessage`: a job that checks the message's state before calling out, and records the delivery only where it isn't recorded yet.

## Related

- [Build Arcturus as independent services connected by HTTP](../adr/0001-build-arcturus-as-services-connected-by-http.md)
- [Run background jobs with graphile-worker](../adr/0012-run-background-jobs-with-graphile-worker.md)
- [Database transactions](./database-transaction.md)
- [Background jobs](./background-job.md)
