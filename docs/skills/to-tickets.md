---
type: skill-guide
---

# to-tickets

Breaks a feature into tickets: small files in `specs/active/<feature>/tickets/`, each a thin slice of the feature that works end to end, says which tickets must be done first, and lists how to tell it's done. Tickets say *what* should work, not which files to change, so an agent (or you) can pick one up and plan the code when it's time to build it.

## When to use it

- After [to-spec](./to-spec.md), to break the spec into tickets.
- For small work that doesn't need a spec, straight after discussing it.

If the work is bigger, or rests on decisions that aren't recorded anywhere, Claude suggests writing a spec first. You can go ahead anyway.

## How to use it

| You type                          | Claude breaks down                                                  |
| --------------------------------- | ------------------------------------------------------------------- |
| `/to-tickets`                     | the spec written or discussed in this conversation, or else the feature discussed |
| `/to-tickets tournament-seeding`  | the spec in `specs/active/tournament-seeding/`                      |
| `/to-tickets add a draw outcome`  | that feature, from its spec if there is one, or the conversation    |

When there's a spec, it wins: if the conversation says something different, Claude points it out rather than picking one.

## Agreeing the breakdown

Before writing, Claude shows a numbered list of tickets, each with what it blocks on, the scopes it touches, what it delivers, and which user stories it covers. It flags:

- **user stories no ticket covers**: drop them or add a ticket;
- **a ticket in a scope the spec doesn't list**;
- **no spec**, when the work looks big enough to need one.

It then asks whether the tickets are the right size, whether the blocking links are right, and whether any should be merged or split. Correct the breakdown until you're happy, then approve it.

## What you get

- One file per ticket, numbered in the order they can be built (a ticket is only blocked by lower numbers), each marked `ready`.
- Each ticket's acceptance criteria are checked at the same boundary the spec says the feature is tested at.

Running it again on the same feature adds tickets after the existing ones and may update tickets that haven't started; tickets in progress or finished are never changed. The spec is never changed either.

Claude doesn't commit. Review the tickets and commit them with the spec.
