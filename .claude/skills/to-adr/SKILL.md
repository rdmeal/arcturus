---
name: to-adr
description: Turn decisions into ADRs — from the current conversation, a discussion record, or a decision you describe — confirming a plan of which ADRs go where before writing them.
disable-model-invocation: true
argument-hint: "[decision or discussion topic]"
---

# To ADR

Turn decisions that have already been made into ADRs. This is a write-up, not an interview: the thinking has been done, and the job is to record it faithfully. The only questions you ask are in the confirmation step, unless the user starts with nothing to write up (see "Starting from nothing").

Call the Skill tool with `adr` first. It defines whether a decision deserves an ADR, which folder it goes in, the file name and number, the frontmatter, the sections and how to supersede. Follow it for every ADR you write.

## 1. Gather the decisions

What the user asked for: $ARGUMENTS

- **A description of a decision** (e.g. "use pnpm and drop yarn"): that decision, with the reasoning from the conversation.
- **A discussion topic:** list the file names in `scratchpad/discussions/` and open only the record whose name matches. If several could match, read the first few lines of each, or ask.
- **Nothing:** if a discussion record has been in use in this conversation, use it; otherwise use the decisions settled in the conversation. If there are none, see "Starting from nothing".

Which decisions to pick up:

- **From a discussion record:** every decision marked `ADR: candidate` with status `settled` or `your call`. Include a `not needed` decision only if the user names it. Never write `open` or `deferred` decisions; say which ones you skipped.
- **From the conversation:** only decisions the user agreed to. A suggestion of yours that nobody answered is not a decision.
- **A partly settled decision** becomes an ADR for the settled part only.

## 2. Check what already exists

For each decision, work out its folder using the `adr` skill's placement rules, then read the frontmatter `summary` of the ADRs already in that folder:

- if an existing ADR already records the decision, skip it and say so;
- if the decision replaces an existing ADR, plan it as a supersede.

## 3. Confirm the plan

Before writing anything, show the plan, one line per ADR:

```
1. Use pnpm as the package manager → docs/adr/0004-use-pnpm.md
   Summary: Use pnpm so that packages can only import the dependencies they declare.
   Supersedes: [Use Yarn 4](docs/adr/0002-use-yarn.md)

2. Store each round as a row → games/rock-paper-scissors/docs/adr/0001-store-rounds-as-rows.md
   Summary: …
   Below the ADR bar: easy to reverse.
```

Flag anything the user should look at: a decision below the ADR bar (say which criterion it misses), a supersede, or a decision skipped because it is already recorded.

**If the reasoning behind a decision is missing** (why it was chosen, what it was weighed against), ask for it here. Never invent reasons: a plausible but made-up Context is worse than none, because future readers will trust it.

Wait for the user to confirm or correct the plan, then write the ADRs.

Decisions adopted on "your call" are written like any other. The user's confirmation of this plan, and later the merge of the PR, is what accepts them.

## 4. Write and report

Write each ADR following the `adr` skill. Then:

- in the discussion record, if there is one, change each written decision's line to `ADR: written: [title](relative link)`, so it isn't picked up again;
- list the files you created or changed.

Don't commit: the user reviews and commits.

## Starting from nothing

If the user runs this with nothing to go on (no arguments, no discussion record, no settled decisions in the conversation), start a conversation about the ADR they want:

1. Ask what decision they want to record.
2. Ask only for what the ADR's sections need and the conversation doesn't already say: the situation and constraints that made the decision necessary, the options that were weighed and why this one won, and what it makes easier or harder. Ask these together, in one message, rather than one at a time.
3. Then continue from step 2 above.

This is a short gathering of facts the user already knows, not a design discussion. If it turns out the decision isn't actually made yet, suggest `/grill-me-with-docs` to work it through first.
