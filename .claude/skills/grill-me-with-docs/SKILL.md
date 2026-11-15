---
name: grill-me-with-docs
description: A relentless interview to stress-test a plan or design that captures docs as it goes — glossary terms written as they're agreed, and every decision recorded in a discussion record ready for /to-adr.
disable-model-invocation: true
argument-hint: "[topic]"
---

# Grill me with docs

A grilling session that also builds the project's documentation as it goes. Glossary terms are written the moment they're agreed. Decisions are captured in a **discussion record**, with their reasoning and rejected alternatives, so they can become ADRs later through `/to-adr` without being reconstructed from memory.

## 1. Load the building blocks

Call the Skill tool with `grilling`, then call the Skill tool with `domain-modelling`. Follow both for the whole session: `grilling` runs the interview, `domain-modelling` challenges the language and writes glossary terms. This skill adds the discussion record.

## 2. Find the topic and its record

The topic is: $ARGUMENTS

If nothing is given above, use the plan or design currently under discussion in this conversation. If there isn't one, ask the user what to discuss.

Discussion records live in `scratchpad/discussions/<topic-slug>.md`. They are local working notes: `scratchpad/` is not committed, and once a decision is recorded as an ADR, the ADR is the permanent record.

List the file names in `scratchpad/discussions/` and look for one matching the topic. Only open a record whose name matches: there may be many records, and reading them all is wasted effort. If several names could match, read just the first few lines of each (frontmatter and heading) to choose, or ask the user.

- **Existing record:** read it, set `status: open`, and start the first round from its `open` and `deferred` decisions, plus anything new the user has raised.
- **No record:** create one from the template below, with a short kebab-case slug for the topic.

## 3. Read before the first round

So that you can push back on conflicts from the first question:

- read `docs/GLOSSARY.md`, `docs/CONTEXT-MAP.md`, and the glossary of any scope the topic touches;
- read the frontmatter `summary` of the ADRs in the relevant scopes' `docs/adr/` folders (the first few lines of each file is enough);
- read an ADR in full only when a question touches it.

## 4. During the session

After every round, update the record with what that round settled, changed, deferred or opened. Updating as you go means nothing is lost if the conversation is compacted or stops partway, and the user can open the file and follow along.

- **Every decision goes in the record**, not only ADR candidates: decisions that don't need an ADR still feed specs and tickets.
- **Mark whether each decision meets the ADR bar** in the `adr` skill (hard to reverse, surprising without context, a real trade-off): `candidate` or `not needed`.
- **Don't write ADRs during the session.** That is `/to-adr`'s job, once decisions have settled. Here, capture what an ADR will need: the reasoning, and the alternatives and why they lost.
- **Glossary terms** are written by `domain-modelling` as soon as they're agreed, not recorded here.

## 5. Ending

When `grilling`'s frontier is empty and the user has confirmed a shared understanding, set the record's `status: closed`. Deferred decisions stay in it, ready for when the topic is picked up again.

Then suggest next steps: `/to-adr` if any decisions are ADR candidates, and `/to-spec` or `/to-tickets` if the discussion was about a feature to build.

## Discussion record format

```md
---
type: discussion
status: open
started: 2026-11-15
---

# {Topic}

{One paragraph: what is being discussed, and why.}

## Decisions

### {The decision, in plain words}

- **Status:** settled
- **ADR:** candidate

{What was decided and why, in a few sentences.}

**Alternatives considered:** {each rejected option and why it lost; leave out if there were none}
```

- **`status`** (frontmatter): `open` while the discussion is under way, `closed` once the user has confirmed a shared understanding.
- **Status** (per decision):
  - `settled`: decided by the user;
  - `your call`: Claude's recommendation, adopted by the user on "your call";
  - `open`: still to be decided;
  - `deferred`: put aside by the user, not to be asked again this session.
- **ADR:** `candidate`, `not needed`, or, once `/to-adr` has written it, `written: [title](relative link)`.
- When a later answer changes a decision, update its entry rather than adding a second one, and note what changed and why in a sentence.
