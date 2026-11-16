---
type: skill-guide
---

# handoff

Type it when you want to stop a conversation and pick it up later in a fresh session. Claude writes a handoff file to `scratchpad/handoffs/` that captures what exists only in the conversation, and links to everything already on disk.

## How to use it

| You type                                   | Claude writes                                           |
| ------------------------------------------ | ------------------------------------------------------- |
| `/handoff`                                 | a handoff, working out the next step itself             |
| `/handoff finish the seeding tiebreaks`    | a handoff weighted towards that as the next session's job |

It works in any conversation, not only on a ticket. Each run writes a new file, `YYYY-MM-DD-HHMM-<slug>.md`, so the latest sorts last. Older handoffs are never changed.

## What's in a handoff

- **Goal and where it stands**, including where the conversation stopped.
- **Read first:** links to the plan, spec, records or code the next step needs, in reading order. They're linked, not copied. With a plan, the handoff is mostly that link.
- **Decisions not yet written down**, each with its reason and where it belongs (plan Notes, an ADR, a glossary, a discussion record).
- **Tried and dropped**, with the reasons.
- **Open questions**, including any Claude asked that you hadn't answered.
- **Working tree:** branch, commit and uncommitted files, each marked finished, half-done or throwaway.
- **Next step**, with the command to run.

Empty sections are left out. Secrets and personal details are redacted.

## What it doesn't do

- It doesn't edit plans, specs, glossaries or ADRs. If a decision belongs in one, Claude tells you where, so you can record it (or run `/to-adr`, or let `/implement` write the plan's Notes) before the conversation is gone.
- It doesn't commit. If you have uncommitted changes, Claude mentions them so you can commit first.

## Resuming

Claude ends with a command to copy, like:

```sh
claude "Read scratchpad/handoffs/2026-11-16-1430-seeding-tiebreaks.md and continue from its Next step."
```

The new session checks the branch and `git status` against the handoff first. If the work has moved on since, it reads what changed before carrying on.
