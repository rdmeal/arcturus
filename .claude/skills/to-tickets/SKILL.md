---
name: to-tickets
description: Break a spec, or a feature discussed in the conversation, into tracer-bullet tickets — thin end-to-end slices with blocked-by links and acceptance criteria — written to specs/active/<feature>/tickets/ after you agree the breakdown.
disable-model-invocation: true
argument-hint: "[feature slug, spec path or feature]"
---

# To Tickets

Break a feature into **tickets**: thin end-to-end slices (tracer bullets), each saying which tickets block it and how to tell it's done. This is a write-up, not an interview: the feature has been worked out, and the job is to cut it into pieces that can be built one at a time. The only questions you ask are about the breakdown, before writing.

Tickets are written so an agent could pick one up, but they describe **intent, not implementation**: what should work and how to tell, with no file paths or code. Turning a ticket into concrete code changes happens later, when the ticket is planned; paths and code written now would go stale before then. Tickets use glossary terms and link ADRs rather than restating them, and never change the glossary, ADRs or the spec.

## 1. Gather the feature

What the user asked for: $ARGUMENTS

- **A feature slug or spec path:** the matching folder in `specs/active/`. Read its `spec.md` in full.
- **A description of a feature:** a matching folder in `specs/active/` if there is one; otherwise that feature, as discussed in the conversation.
- **Nothing:** the spec written or discussed in this conversation; otherwise the feature discussed in the conversation.

**When there is a spec, it is the source of truth.** If the conversation says something different, flag the difference in the confirmation step rather than silently following either.

Without a spec, take only what the user agreed to; a suggestion of yours that nobody answered is not part of the feature. If there is nothing to break down, say so and suggest `/to-spec` (if a feature has been discussed but not written up) or `/grill-me-with-docs` (if it hasn't been worked through).

## 2. Read what already exists

- `docs/GLOSSARY.md`, `docs/CONTEXT-MAP.md`, and the glossary of each scope the feature touches.
- The frontmatter `summary` of the ADRs in those scopes' `docs/adr/` folders, to link the ones a ticket depends on.
- The feature folder's `tickets/`, if it exists (see "Existing tickets").
- The code, as far as needed to size the slices and spot prefactoring. What you learn shapes the breakdown, but no paths or code go in the tickets.

## 3. Draft the slices

Each ticket is a **tracer bullet**:

- it cuts a narrow but complete path through every layer the feature needs, rather than building one layer across the whole feature; a finished layer with nothing above it proves nothing;
- once done, it can be demonstrated or checked on its own;
- it fits in a single fresh context window, so an agent can build it without the history of this conversation;
- prefactoring comes first: "make the change easy, then make the easy change". A prefactor ticket describes its intent too ("make X possible without changing behaviour"), not the code changes.

Give each ticket its **blockers**: the tickets that must be done before it can start. Only list tickets that genuinely gate it; every extra link makes the work more sequential than it needs to be.

**Wide refactors are the exception to vertical slicing.** A wide refactor is one mechanical change (rename a concept, retype something shared) that breaks every caller at once, so no vertical slice can land with the build green. Sequence it as **expand–contract**: first expand, adding the new form beside the old so nothing breaks; then migrate the callers in batches (per package, per directory), each batch its own ticket blocked by the expand; finally contract, removing the old form in a ticket blocked by every batch.

**Acceptance criteria** are checkable at the spec's test boundary, so each ticket is proven the same way the feature is. Without a spec, propose a test boundary in the confirmation step: prefer one that already exists, the highest one that can prove the behaviour, as few as possible.

**Every user story in the spec must be delivered by at least one ticket.**

## 4. Agree the breakdown

Show the proposed breakdown, numbered from `01` in dependency order, so a ticket is only ever blocked by lower numbers:

```
01. Play a single round between two agents
    Blocked by: none · Scopes: rock-paper-scissors
    Delivers: two agents can play one round and both see the result.
    Stories: 1, 2

02. …
```

Then the flags, each with what to do about it:

- **user stories no ticket delivers:** drop them from this breakdown, or add a ticket;
- **a ticket touching a scope the spec doesn't list:** check whether the spec or the ticket is wrong;
- **differences between the spec and the conversation**;
- **no spec, and the work is more than a few tickets or rests on decisions that aren't in ADRs:** suggest `/to-spec` first, so the what and why are recorded somewhere committed. The user can go ahead anyway.

Then ask:

- Is the granularity right (too coarse, too fine)?
- Are the blocking links right: does each ticket depend only on tickets that genuinely gate it?
- Should any tickets be merged or split?

Iterate until the user approves the breakdown, then write the tickets.

## 5. Write and report

Write one file per ticket, `specs/active/<feature-slug>/tickets/NN-<slug>.md`, from the template below. Without a spec, choose a short kebab-case feature slug and show it in the confirmation step; the folder holds only `tickets/`.

Then list the files you created or changed. Don't commit: the user reviews and commits.

## Ticket format

```md
---
type: ticket
status: ready
blocked-by: ["01"]
scopes: [rock-paper-scissors]
---

# 02: {Title}

Part of [the spec](../spec.md); delivers user stories 3 and 4.

## What to build

{The end-to-end behaviour this ticket makes work, from the user's point of view, not a layer-by-layer list.}

## Acceptance criteria

- [ ] {A behaviour, checkable at the test boundary}
- [ ] …

## Notes

{Optional: links to ADRs the ticket depends on, or a pitfall worth knowing. Leave the section out if there is nothing to say.}
```

- **Frontmatter:** `status` is `ready` when written. `blocked-by` lists ticket numbers in the same feature as quoted two-digit strings, `[]` if none; "blocked" is never a status, because whether a ticket can start follows from its blockers' status. `scopes` are context-map IDs. The title is the `# H1`.
- **Blockers live only in the frontmatter.** Don't repeat them in the body, so the two can't drift apart.
- **The spec line** is left out when there is no spec.
- **No file paths or code.** Exception: if a prototype produced a snippet that encodes a decision more precisely than prose (a state machine, a schema, a type shape), include the decision-rich part and say it came from a prototype.

## Existing tickets

If the feature folder already has tickets:

- new tickets continue the numbering; never renumber existing ones, because `blocked-by` refers to the numbers;
- `ready` tickets may be updated in place; show what will change in the confirmation step;
- `in-progress`, `done` and `cancelled` tickets are left alone; if one would need to change, flag it instead.

The spec is never changed: its status stays as it is, and it doesn't list its tickets, because the `tickets/` folder already does.
