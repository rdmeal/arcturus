---
type: skill-guide
---

# grill-me

Claude interviews you about a plan, design or idea until you both understand it the same way. It surfaces the decisions you haven't made yet and the assumptions you haven't stated, before anything is built or written down.

It writes no documents. To capture glossary terms and decisions as you go, use [grill-me-with-docs](./grill-me-with-docs.md) instead.

## When to use it

- You have a plan and want it challenged before acting on it.
- You want to think a design through out loud, with someone asking the awkward questions.
- You're about to write a spec or tickets and want to be sure the thinking is settled first.

## How to use it

```
/grill-me <what to grill you about>
```

For example, `/grill-me how tournament formats should declare which games they support`. Without a subject, Claude grills you on whatever plan is being discussed in the conversation.

You don't have to type the command: saying "grill me on this" in a message starts the same kind of session.

## What happens

Claude asks questions in **rounds**. Each round contains every question that can be answered now, without depending on another open question. Each question is numbered and comes with Claude's recommended answer:

```
❓ **Q3 – Where should option defaults live?**: …

➡️ In the game manifest, so every tournament starts from the game's own defaults.
```

Your answers unlock the next round's questions. Claude looks up facts (code, docs, ADRs) itself rather than asking you, and points out when an answer conflicts with something you said earlier or with what's already in the repo.

## Answering

Answer by number, in your own words:

| You say            | What it means                                                                |
| ------------------ | ---------------------------------------------------------------------------- |
| `Q3 yes`           | Accept the recommendation. Questions are worded so "yes" always means this.  |
| `Q3 no, because …` | Reject it, and explain; Claude follows up if needed.                         |
| `Q3 defer`         | Leave it for later. It won't be asked again or block the end of the session. |
| `Q3 your call`     | Adopt Claude's recommendation; it's recorded as Claude's, accepted by you.   |
| `wrap up`          | Stop asking and go to the summary.                                           |

There is no limit on the number of questions. If a session runs very long, the subject is probably too big: wrap up and grill the pieces separately.

## How it ends

When there are no questions left, Claude posts a summary of what was settled, what was adopted on "your call", and what was deferred, and asks you to confirm you both understand the same thing. It does nothing with the results until you confirm.

## What next

The summary stays in the conversation. To turn it into documents:

- [to-adr](./to-adr.md): record the decisions as ADRs.
- [to-spec](./to-spec.md): write a spec for the feature.
- [to-tickets](./to-tickets.md): break the work into tickets.
