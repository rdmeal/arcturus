---
type: skill-guide
---

# to-adr

Turns decisions into ADRs (architecture decision records): short documents in `docs/adr/` (or a service's, game's or agents' own `docs/adr/`) that record what was decided and why, so nobody later has to guess.

## When to use it

- After a [grill-me-with-docs](./grill-me-with-docs.md) session, to turn its ADR candidates into ADRs.
- After any conversation that settled a decision worth recording.
- When you've made a decision and want it recorded, even without a prior discussion.

## How to use it

| You type                                   | Claude records                                                        |
| ------------------------------------------ | --------------------------------------------------------------------- |
| `/to-adr`                                  | the decisions settled in this conversation (or its discussion record) |
| `/to-adr use pnpm and drop yarn`           | that decision                                                         |
| `/to-adr player failure outcomes`          | the ADR candidates in that discussion record                          |
| `/to-adr` with nothing discussed yet       | asks what decision you want to record, then the reasons behind it     |

From a discussion record, Claude picks up the decisions marked as ADR candidates that are settled and not yet written. Open and deferred decisions are never written; Claude tells you which it skipped. To include a decision marked as not needing an ADR, name it.

## Confirming the plan

Before writing anything, Claude shows a plan: one line per ADR, with its title, where it will be written, and a one-line summary. It flags:

- **decisions below the ADR bar** (e.g. easy to reverse); they are still written if you confirm;
- **supersedes**, where a new decision replaces an existing ADR; both files are updated;
- **decisions already recorded** in an existing ADR, which are skipped.

If the reasoning behind a decision isn't in the conversation, Claude asks for it here rather than making it up. Correct anything in the plan (a title, a folder, what to include), then confirm.

## What you get

- The new ADRs, each marked `accepted`. Merging the PR that contains them is what really accepts them.
- Superseded ADRs updated to point at their replacements.
- In the discussion record, each decision that became an ADR links to it, so it isn't picked up again.

Claude lists every file it created or changed. It doesn't commit; review the ADRs and commit them with the work they relate to.
