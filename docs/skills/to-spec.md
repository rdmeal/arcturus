---
type: skill-guide
---

# to-spec

Turns a feature you've already discussed into a spec: a short document in `specs/active/<feature>/spec.md` that says what the feature is for, what it does, the decisions behind it, and how it will be proven to work. It's the starting point for breaking the feature into tickets.

## When to use it

- After a [grill-me-with-docs](./grill-me-with-docs.md) session about a feature to build.
- After any conversation that worked a feature through.

It writes up a design; it doesn't create one. If the feature hasn't been discussed yet, Claude suggests `/grill-me-with-docs` first.

## How to use it

| You type                      | Claude writes up                                                      |
| ----------------------------- | --------------------------------------------------------------------- |
| `/to-spec`                    | the feature discussed in this conversation (or its discussion record) |
| `/to-spec tournament seeding` | that feature, from the conversation or the matching discussion record |

Only what you agreed to goes in the spec. Suggestions Claude made that nobody answered don't.

## Confirming the outline

Before writing, Claude shows:

- **where the spec will go** and which scopes it touches;
- **the test boundary**: the public boundary (e.g. a protocol or a service's API) where the feature is proven to work. Correct it if it's not where you expect.
- **a one-line outline** of each section, with the user stories' titles;
- **flags**: decisions that aren't settled yet, terms not in the glossary, decisions that look like they deserve an ADR (run [to-adr](./to-adr.md) for those), and reasoning that's missing from the conversation, which Claude asks you for rather than making up.

If decisions are unsettled, it's best to settle them first. If you go ahead anyway, they're listed under **Open questions** in the spec.

## What you get

A spec with these sections: Problem, Solution, User stories, Decisions (linking ADRs), Testing, Out of scope, and Open questions if needed. It's marked `ready`.

If a spec for the feature already exists and isn't finished, Claude updates it and shows what changes. If it's in progress, Claude flags that its tickets may need revisiting.

Claude doesn't commit. Review the spec, then run [to-tickets](./to-tickets.md) to break it into tickets.
