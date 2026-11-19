---
type: skill-guide
---

# grill-me-with-docs

A [grill-me](./grill-me.md) session that also writes things down as it goes. Claude interviews you about a plan or design, and meanwhile:

- **writes glossary terms** to `docs/GLOSSARY.md` (or a scope's glossary) as soon as you agree them;
- **records every decision** in a discussion record, with the reasoning and the alternatives you rejected, ready to become ADRs or pattern docs.

## When to use it

- Designing something whose decisions and vocabulary should outlive the conversation.
- Reassessing or tightening the project's terminology.
- Any discussion you expect to turn into ADRs, a spec or tickets.
- Agreeing a coding pattern (how test data is built, how external endpoints are mocked) before it's first implemented.

For a quick stress-test where nothing needs writing down, use [grill-me](./grill-me.md) instead.

## How to use it

```
/grill-me-with-docs <topic>
```

For example, `/grill-me-with-docs player failure outcomes`. Without a topic, Claude uses the plan being discussed in the conversation.

The questions, rounds and ways of answering (`yes`, `defer`, `your call`, `wrap up`, …) are the same as in [grill-me](./grill-me.md#answering). On top of that, Claude challenges words that clash with the glossary or are vague, and tests definitions with awkward scenarios.

When the discussion turns to how a kind of code should be written each time, Claude also checks it against the existing patterns, names the usual alternatives, and tests the rules with awkward cases until they could be followed without any code to copy.

## What gets written

| What           | Where                                     | When                        |
| -------------- | ----------------------------------------- | --------------------------- |
| Glossary terms | `docs/GLOSSARY.md`, or a scope's glossary | As soon as you agree a term |
| Decisions      | `scratchpad/discussions/<topic>.md`       | After every round           |

Claude says in one line whenever it adds a glossary term. If a term belongs to a service, game or game's agents that has no docs yet, it asks before adding the new scope to `docs/CONTEXT-MAP.md`.

The **discussion record** lists each decision with its status (`settled`, `your call`, `open` or `deferred`), whether it deserves an ADR, which pattern it belongs to (if any), the reasoning, and the alternatives considered. You can open it at any time to follow along. It is a local working note: `scratchpad/` isn't committed, and the ADRs and pattern docs become the permanent record.

No ADRs or pattern docs are written during the session.

## Picking a discussion back up

Run the command again with the same topic. Claude finds the existing record by its file name, reads it, and starts from the open and deferred decisions. Discussions can run over as many sessions as they need.

## How it ends

As with [grill-me](./grill-me.md#how-it-ends), Claude summarises and asks you to confirm. It then marks the record closed and suggests what to do next:

- [to-adr](./to-adr.md): turn the ADR candidates into ADRs.
- [to-pattern](./to-pattern.md): turn the pattern decisions into pattern docs, after `/to-adr` so they can link their ADRs.
- [to-spec](./to-spec.md) or [to-tickets](./to-tickets.md): if the discussion was about a feature to build.
