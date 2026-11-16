---
name: to-spec
description: Turn a feature that has already been discussed into a spec — the what and why, with user stories, decisions and the boundary it is tested at — written to specs/active/ after you confirm an outline.
disable-model-invocation: true
argument-hint: "[feature or discussion topic]"
---

# To Spec

Turn a feature that has already been worked through into a **spec**: the *what and why* of the feature, for whoever later breaks it into tickets and builds it. This is a write-up, not an interview: the design has been done, and the job is to record it faithfully. The only questions you ask are in the confirmation step.

A spec describes intent, not implementation. It links ADRs and uses glossary terms rather than restating them. It never changes the glossary or ADRs; it only reads them.

## 1. Gather the feature

What the user asked for: $ARGUMENTS

- **A description of a feature:** that feature, as discussed in the conversation.
- **A discussion topic:** list the file names in `scratchpad/discussions/` and open only the record whose name matches. If several could match, read the first few lines of each, or ask.
- **Nothing:** if a discussion record has been in use in this conversation, use it; otherwise use the feature discussed in the conversation.

Take only what the user agreed to. A suggestion of yours that nobody answered is not part of the design. From a discussion record, `settled` and `your call` decisions count; `open` and `deferred` ones are unsettled (see step 3).

**If there is nothing to write up** (no feature has been discussed, or the discussion never got past the idea), don't gather the design here: a spec needs a design that has been worked through, not a handful of facts. Say so and suggest `/grill-me-with-docs <feature>` first.

## 2. Read what already exists

- `docs/GLOSSARY.md`, `docs/CONTEXT-MAP.md`, and the glossary of each scope the feature touches, so the spec uses the agreed terms.
- The frontmatter `summary` of the ADRs in those scopes' `docs/adr/` folders, so decisions can be linked rather than restated. Read an ADR in full only when you need to.
- `specs/active/` and `specs/archive/` for a folder for the same feature (see "An existing spec").
- The code, only as far as needed to find the existing public boundaries the feature could be tested at.

## 3. Confirm the outline

Before writing, show one message with:

- **Path:** `specs/active/<feature-slug>/spec.md`, with a short kebab-case slug.
- **Scopes:** the IDs from `docs/CONTEXT-MAP.md` the feature touches.
- **Test boundary:** the public boundary at which the feature is proven to work (e.g. a protocol between services, or a service's API). Prefer boundaries that already exist; pick the highest one that can prove the behaviour; use as few as possible, ideally one. Testing through a public boundary keeps the tests about behaviour, so they survive refactoring. If a new boundary is needed, propose it at the highest point you can.
- **Outline:** one line per section of the template, and the titles of the user stories.
- **Flags**, each with what to do about it:
  - **unsettled decisions** the feature depends on (`open` or `deferred`, or never discussed): suggest settling them first. If the user goes ahead, they go in an **Open questions** section.
  - **terms not in a glossary** (often the actors in the user stories): the spec uses plain words for them; suggest settling them later with `/grill-me-with-docs`.
  - **decisions that look ADR-worthy but have no ADR**: suggest `/to-adr`. Don't write ADRs here.
  - **missing reasoning**: if why something was decided isn't in the conversation, ask. Never invent reasons; a plausible but made-up reason is worse than none, because future readers will trust it.

Wait for the user to confirm or correct the outline, then write the spec.

## 4. Write and report

Write the spec from the template below, then:

- list the file you created or changed;
- suggest `/to-tickets` to break the spec into tickets.

Don't commit: the user reviews and commits.

## Spec format

```md
---
type: spec
status: ready
scopes: [tournament-runner, player-gateway]
created: 2026-11-15
---

# {Feature name}

## Problem

{The problem, from the point of view of whoever has it.}

## Solution

{What will change, from that same point of view.}

## User stories

1. As a {actor}, I want {capability}, so that {benefit}.
2. …

## Decisions

- [{ADR title}]({relative link to the ADR}): {how it applies to this feature, if that isn't obvious}.
- {A decision below the ADR bar}: {why}.

## Testing

{The test boundary, and what is proven there: which behaviours, and how a test tells they work.}

## Out of scope

- {What this feature deliberately doesn't do, and why if it isn't obvious.}

## Open questions

- {Only if the user chose to go ahead with unsettled decisions; leave the section out otherwise.}
```

- **Frontmatter:** `status` is always `ready` when written; `scopes` are context-map IDs; `created` is today's date. The title is the `# H1`, not a frontmatter field.
- **User stories:** cover every behaviour that was discussed, including failure and edge cases, without padding. Use glossary terms for actors where they exist.
- **Decisions:** link ADRs rather than restating them. No file paths or code: they go stale fast. Exception: if a prototype produced a snippet that encodes a decision more precisely than prose (a state machine, a schema, a type shape), include the decision-rich part and say it came from a prototype.
- **Links:** only to committed documents (ADRs, glossaries, other specs), as relative paths. Never link a discussion record: `scratchpad/` isn't committed, so the link would be dead for everyone else.

## An existing spec

If a folder for the same feature already exists:

- **in `specs/active/` with `status: ready`:** update the spec in place, and show what will change in the confirmation step;
- **in `specs/active/` with `status: in-progress`:** update it the same way, and flag that its tickets may need revisiting;
- **in `specs/archive/`:** it is finished or cancelled; start a new feature folder with a different slug rather than reopening it.

Moving a spec through its other statuses, and moving finished or cancelled feature folders to `specs/archive/`, is not this skill's job.
