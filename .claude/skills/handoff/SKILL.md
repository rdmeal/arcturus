---
name: handoff
description: Write a handoff of the current conversation to scratchpad/handoffs/ so a fresh session can pick up where this one stopped. It records where things stand, decisions not yet written down, what was tried and dropped, the working tree and the next step, and links to plans, specs and other docs instead of copying them.
disable-model-invocation: true
argument-hint: "[what the next session will do]"
---

# Handoff

Write a **handoff file** that lets a fresh session carry on from where this conversation stopped. The next session starts with no memory of this one. It has only the repo and this file, so the handoff has to carry what exists **only in this conversation**: where things stand, decisions not yet written down, what was tried and why it was dropped, and what comes next.

Everything already on disk (a plan, a spec, a discussion record, an ADR, code) is **linked, not copied**. The next session reads those itself. A copy costs tokens twice and goes stale; a link doesn't. When a plan exists, the handoff is mostly a link to it plus whatever is still in flight.

This works in any conversation, not only on a ticket.

What the next session will do, if the developer said: $ARGUMENTS

If that's given, weight the handoff towards it: put the documents it needs first in "Read first" and make it the Next step. If not, work out the next step from the conversation.

## 1. Gather

- **The conversation** is the main source. Go back over it for the goal, decisions and their reasons, approaches dropped, questions still open (including any question you asked that the developer hasn't answered yet), and what was about to happen next.
- **Git:** run `git branch --show-current`, `git rev-parse --short HEAD` and `git status --short`. Don't read diffs. The next session can run `git diff`.
- **Linked documents:** don't read them to summarise them. Read one only to check a claim you're about to make, for example which of a plan's steps are ticked, or whether a decision is already written in a doc (if it is, it isn't "not yet written down").

Don't search the repo. If you're not sure where something lives, say so in the handoff rather than going looking.

## 2. Sort what's not on disk

For each decision made in this conversation, check whether it's already written somewhere durable. If it is, it's covered by the link. If it isn't, it goes under "Decisions not yet written down", with **where it belongs**:

- a step or detail of a ticket's plan: the plan's Notes, written by the next `/implement`;
- a decision that clears the ADR bar: `/to-adr`;
- a term: the right glossary, through `domain-modelling`;
- a design discussion: its discussion record.

**Don't write any of these yourself.** The handoff never edits a plan, spec, glossary, ADR or any other document. The plan has one writer, and the developer decides what's recorded. Just say where each item belongs; the report points this out too.

## 3. Write the handoff

Get the time with `date +%Y-%m-%d-%H%M` (local time) and pick a 2–4 word kebab-case slug for the topic. Write `scratchpad/handoffs/YYYY-MM-DD-HHMM-<slug>.md` with the template below.

- **Leave out empty sections.** A short handoff is a good handoff.
- **Aim for about a screen.** If it's much longer, you're probably copying something the next session could read.
- **Redact secrets and personal details:** keys, tokens, passwords, email addresses. The scratchpad is gitignored, but handoffs get pasted around.
- **Never edit an older handoff.** Each run writes a new file. If this conversation started from a handoff, link it as "Supersedes".
- **Links are repo-relative paths** (or URLs), with a few words on what each one is for. Use symbol names instead of line numbers; they survive edits.
- **Write the decisions with their reasons.** A bare decision gets re-opened; "X, because Y" doesn't.

## 4. Report

- The handoff's path.
- Anything under "Decisions not yet written down", with where it belongs, so the developer can record it before the conversation is gone.
- Any uncommitted changes the developer may want to commit first.
- A command to resume, e.g. `claude "Read scratchpad/handoffs/2026-11-16-1430-seeding-tiebreaks.md and continue from its Next step."`

## Handoff template

```md
# Handoff: {topic}

{date and time} · Supersedes: `{earlier handoff path}` {omit if none}

> **Before acting:** check the branch and `git status` against "Working tree" below. If they differ, the work has moved on since this was written. Read what changed before continuing.

## Goal and where it stands

{What this work is for, in one or two sentences. Then where it got to: what's done, what's half-done, and where the conversation stopped.}

## Read first

1. `{path}`: {what it is and what to take from it}

{In reading order. Only what the next step needs.}

## Decisions not yet written down

- **{decision}**, because {reason}. Belongs in: {plan Notes | ADR via /to-adr | glossary | discussion record}.

## Tried and dropped

- **{approach}**: dropped because {reason}.

## Open questions

- {question} {Mark one that was asked and is waiting on the developer's answer: "(asked, unanswered)".}

## Working tree

- **Branch:** `{branch}` at `{short hash}`
- **Uncommitted:**
  - `{path}`: {what the change is}; {finished | half-done | throwaway}

## Next step

{What to do next, concretely.} Run: `{command, e.g. /implement, or "none"}`
```
