---
name: plan-ticket
description: Plan a ticket with the developer — read the ticket and only the docs it depends on, agree the steps interactively, then write a step-by-step plan file to specs/active/<feature>/plans/, create the ticket's branch and mark the ticket in progress.
disable-model-invocation: true
argument-hint: "[ticket path | feature NN | feature slug]"
---

# Plan Ticket

Turn a ticket's **intent** into a concrete, step-by-step **plan**: which code changes, tests and doc updates are needed, in which order, and how to check each step. The plan is the only thing a later session needs to read to carry on, so it has to be complete. Another session runs it with `/implement`, possibly several sessions on the same branch.

**Keep this session cheap.** The developer guides the planning and points you at what matters. Read what the ticket depends on and what the developer names, not the codebase at large. Every file you read costs tokens in this session, and the plan exists so that later sessions read even less.

## 1. Find the ticket

What the user asked for: $ARGUMENTS

- **A ticket path, or a feature and number** (`tournament-seeding 02`): that ticket in `specs/active/<feature>/tickets/`.
- **A feature slug only:** list that feature's **frontier** and ask which ticket to plan. The frontier is the tickets with status `ready` whose `blocked-by` tickets are all `done`. Build it from the tickets' frontmatter only.
- **Nothing:** the ticket discussed in this conversation, if there is one. Otherwise, list the frontier across every feature in `specs/active/` and ask.

## 2. Check it can be planned

- **A plan already exists** (`plans/NN-<slug>.md` with the ticket's number): say so and suggest `/implement`. If the developer wants to change the plan, you may rewrite steps that aren't ticked, but never ticked ones. Record what changed in the plan's Notes.
- **Status `done` or `cancelled`:** stop; there's nothing to plan.
- **Status `in-progress` with no plan** (e.g. set by hand): carry on.
- **A `blocked-by` ticket isn't `done`:** warn, and carry on only if the developer agrees.

## 3. Read what the ticket depends on

Read only these:

- **The ticket**, in full.
- **From the spec** (if the feature has one): the user stories the ticket says it delivers, and the **Decisions**, **Testing** and **Open questions** sections. Not the rest.
- **The ADRs linked** from the ticket and from the spec's Decisions section, in full. They're constraints on the plan.
- **`docs/GLOSSARY.md`, and the glossary of each scope** in the ticket's `scopes`. Find scopes' paths in `docs/CONTEXT-MAP.md`. The plan names types, functions and test cases, and those names use glossary terms.
- **The patterns:** only the `summary` line of each pattern (e.g. with grep), not the files. **Always `docs/patterns/*.md`**, because most patterns are Arcturus-wide even when one scope uses them, plus `<scope path>/docs/patterns/*.md` for each scope in the ticket's `scopes`. A folder may not exist yet.

**If the ticket depends on one of the spec's open questions, stop.** A plan built on an unsettled decision would be built on a guess. Say which question it is and suggest `/grill-me-with-docs`, which settles it and updates the spec.

**If the feature has no spec,** you don't know the test boundary: the public boundary where the ticket's acceptance criteria are checked. Ask the developer for it in step 4, and record it in the plan's Context.

### Reading code

- **Do:** read the files the developer points you at, and files you can name precisely from them, such as a module they import or the test file next to them.
- **Don't:** search broadly (grep across the repo, list whole directory trees, spawn an Explore agent) without asking first. Ask briefly, e.g. "I'd like to search for where X is constructed, to find the files step 3 touches". The developer usually knows the answer, and asking them costs fewer tokens than searching.

## 4. Brief and ask

Give a short brief:

- what the ticket needs, in a sentence or two;
- the ADRs and their constraints that apply;
- the patterns that look relevant, from their summaries;
- the test boundary;
- any warnings (blockers, a scope the spec doesn't list, anything in the ticket that looks inconsistent).

Then ask **one round of numbered questions, each with your recommended answer**, about what the plan can't be written without. For example: where the new code goes, what existing code it builds on, which patterns apply, whether a prefactor step is needed. End the round by inviting extra context and pointers to code.

Read what the developer points at. Ask further rounds only while an answer would change the plan. This is a planning conversation, not a grilling: once the plan can be written, stop asking.

### A step needs a pattern that doesn't exist yet

When a step needs a kind of code that should be written the same way each time (it clears the bar in the `pattern` skill) and no pattern covers it, call the Skill tool with `pattern`. Recommend which case it is; the developer decides:

- **Small:** a handful of rules with no real trade-off. Settle the rules in your question rounds, following `pattern`'s guidance on discussing a pattern. The doc is written in section 6, on the ticket's branch, because the step's Read first needs it.
- **Big:** real alternatives to weigh, or a decision that clears the ADR bar. **Stop**, and suggest `/grill-me-with-docs` followed by `/to-pattern`, then planning again. A plan built on an unsettled pattern is built on a guess, the same reason you stop on a spec's open question.

## 5. Agree the outline

Show the steps as a numbered list of titles, each with a one-line goal, ending with the acceptance-criteria step. For example:

```
1. Extract round scoring into its own module (prefactor, no behaviour change)
2. Score a draw as half a point to each player
3. Show draws in the standings
4. Document draw scoring in the tournament-runner glossary
5. Acceptance criteria
```

Shape the steps like this:

- **Each step is commit-sized and keeps the build green.** The developer commits after each one.
- **Prefactoring comes first:** "make the change easy, then make the easy change".
- **Tests belong in the step whose behaviour they prove,** not in a separate testing phase at the end.
- **Documentation updates are steps too** (a glossary entry, a guide, a README). Leave them out only if nothing needs updating.

Iterate until the developer approves the outline.

## 6. Branch, write, set statuses

1. **Check git.** The working tree should be clean and on `main`. If it isn't, say what you see and ask how to proceed.
2. **Create the branch** `ticket/<feature>-NN-<slug>`, using the ticket's file name.
3. **Write the plan** to `specs/active/<feature>/plans/NN-<slug>.md`, from the format below. If a small new pattern was settled in section 4, write its doc too, following the `pattern` skill, with its exemplar "None yet". Mark the step that first uses it, and every other first use of a pattern whose exemplar is "None yet", with **Establishes** (see the format).
4. **Set statuses:** the ticket to `in-progress`. Also set the spec to `in-progress` if it's still `ready`, because this is the feature's first ticket started. Change nothing else in either file.

Don't commit; the developer reviews and commits.

## 7. Report

- The branch, and the files you created or changed.
- **Decisions from planning that look ADR-worthy:** suggest `/to-adr`. Don't write ADRs here.
- **Patterns:** any pattern doc you wrote, and which step establishes it.
- Next: review and commit, then `/implement`, in this session or a fresh one.

## Plan format

```md
---
type: plan
---

# Plan 02: {Ticket title}

Implements [ticket 02](../tickets/02-draw-outcome.md), part of [the spec](../spec.md).

## Context

- **Test boundary:** {the boundary from the spec's Testing section, or as agreed when there's no spec}
- **ADRs:** [0004: Rounds are scored by the referee](../../../../docs/adr/0004-rounds-scored-by-referee.md): {one line on what it constrains here}
- **Patterns:** [object-mother](../../../../docs/patterns/object-mother.md): {where it applies}
- **Planning decisions:**
  - {a decision made in this session, with a short reason}

## Steps

- [ ] **1. {Title}**
  - **Goal:** {what this step achieves, and that the build stays green}
  - **Files:** `path/to/file.ts` ({what changes: types or functions to add or change, with signatures once decided}), …
  - **Read first:** {the patterns, ADRs or docs needed for this step only; "none" if none}
  - **Establishes:** [object-mother](../../../../docs/patterns/object-mother.md) {only on the step that implements a pattern for the first time, i.e. its exemplar is "None yet"; leave the line out otherwise}
  - **Tests:** {the behaviours to test, as test-case names, and where they go}
  - **Check:** `{the narrowest command that proves this step, e.g. tests for the affected project}`
- [ ] **2. …**

**N. Acceptance criteria**, checked at the test boundary:

- [ ] {criterion, as written in the ticket}: proven by `{test name}` in `{file}`
- [ ] …

## Notes

{Empty when written. Implementing sessions add what later sessions need to know, and any change to the plan, with the date.}
```

- **Frontmatter is only `type: plan`.** The path already ties the plan to its ticket, and whether the plan is complete follows from its checkboxes.
- **One checkbox per step,** with the step's details as plain sub-bullets. The exception is the acceptance-criteria step: each criterion has its own checkbox, so "every box ticked" means the criteria are proven too.
- **Establishes** tells `implement` that the pattern doc is a spec with no example yet, and tells `finish-ticket` which step's Files hold the exemplar. The pattern is in that step's Read first as well.
- **No full code bodies.** Name what changes, with signatures where they're decided. The code itself is written during `/implement`, when the developer can guide it, and code in a plan goes stale as earlier steps change the files.
- **Read first** carries this session's choices forward. An implementing session reads only what each step names, so name everything a step needs and nothing it doesn't.
- **Check** is a real command. The repo's tooling grows over time, so use what exists. If you don't know the right command, ask rather than guess.
- **Links are relative** from the `plans/` folder. They still work after the feature folder moves to `specs/archive/`, because the depth stays the same.
- **The spec link** is left out when the feature has no spec.
