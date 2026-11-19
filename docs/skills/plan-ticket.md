---
type: skill-guide
---

# plan-ticket

Plans a ticket with you, then writes the plan to `specs/active/<feature>/plans/NN-<slug>.md`. The plan is a step-by-step checklist of code changes, tests and doc updates. It's complete enough that any later session can pick it up with `/implement` by reading the plan alone.

Planning is a conversation you lead. Claude reads the ticket and only the docs it depends on, then asks you where to look. It doesn't explore the codebase on its own, which keeps the session cheap and keeps you in control of the approach.

## When to use it

When a ticket is ready to build: its status is `ready` and its blockers are `done`. It's the first step after [to-tickets](./to-tickets.md).

## How to use it

| You type                              | Claude plans                                                                            |
| ------------------------------------- | --------------------------------------------------------------------------------------- |
| `/plan-ticket tournament-seeding 02`  | ticket 02 of that feature                                                               |
| `/plan-ticket specs/active/…/02-….md` | that ticket                                                                             |
| `/plan-ticket tournament-seeding`     | lists that feature's tickets that can start now, and asks which                         |
| `/plan-ticket`                        | the ticket discussed in the conversation, or else lists every ticket that can start now |

## What Claude reads

- The ticket.
- From the spec, only: the user stories the ticket delivers, Decisions, Testing and Open questions.
- The ADRs the ticket and spec link to.
- The glossaries for the ticket's scopes.
- Only the one-line summaries of the patterns: always those in `docs/patterns/`, plus those in the ticket's scopes.

Beyond that, it reads the code you point it at, and files it can name directly from those. It asks before searching more widely.

It stops if the ticket depends on one of the spec's open questions, and suggests [grill-me-with-docs](./grill-me-with-docs.md) to settle it first. It warns if a blocking ticket isn't done yet.

## The conversation

1. Claude gives a short brief: what the ticket needs, the ADRs and patterns that apply, the test boundary, and any warnings.
2. It asks a round of numbered questions, each with a recommended answer, and invites you to add context or point at code. This is the time to say which patterns to follow and where things should go.
3. It proposes the steps as a list of titles. Correct the list until you're happy, then approve it.

**If a step needs a pattern that doesn't exist yet,** Claude says whether it looks small or big, and you decide. A small one (a few rules, no real trade-off) is agreed in the question rounds and written as a pattern doc alongside the plan. A big one stops planning: settle it with [grill-me-with-docs](./grill-me-with-docs.md) and [to-pattern](./to-pattern.md) first, then plan again.

## What you get

- A new branch, `ticket/<feature>-NN-<slug>`. Claude checks you're on a clean `main` first.
- The plan file. Each step is commit-sized and keeps the build green, and lists:
  - its goal;
  - the files it touches;
  - what to read first;
  - the pattern it establishes, if it's the first code to follow a new pattern;
  - the tests it adds;
  - a command that checks it.

  The last step lists each acceptance criterion with the test that proves it.

- The ticket set to `in-progress`, and the spec too if this is its first ticket.
- Any new pattern doc agreed during planning, in `docs/patterns/` (or a scope's own), to commit with the plan.
- A list of any decisions that look worth an ADR (use [to-adr](./to-adr.md)).

If the ticket already has a plan, Claude suggests `/implement` instead. It can revise steps that haven't been done yet, but never ones already ticked.

Claude doesn't commit. Review the plan and commit it, then start `/implement`.
