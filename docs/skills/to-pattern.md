---
type: skill-guide
---

# to-pattern

Turns agreed coding patterns into pattern docs: short documents in `docs/patterns/` that say how one kind of code is written in this repo (where it lives, what it's called, its shape, what to avoid), so every instance is written the same way. Examples are object mothers for test data, or mocking external endpoints with MSW.

A pattern is usually agreed **before** it's first implemented. The doc's rules are written so they can be followed without any code to copy, and its exemplar (a real file that follows them) is filled in when the first ticket that uses it finishes.

## When to use it

- After a [grill-me-with-docs](./grill-me-with-docs.md) session that agreed a pattern.
- After any conversation that settled how a kind of code should be written.
- To turn existing code into a pattern: `/to-pattern make <file> a pattern`.
- To update a pattern, or move one from a service's or game's own docs to `docs/patterns/` when it turns out to apply more widely.

## How to use it

| You type                                                  | Claude writes                                                          |
| --------------------------------------------------------- | ---------------------------------------------------------------------- |
| `/to-pattern`                                             | the patterns agreed in this conversation (or its discussion record)    |
| `/to-pattern test data`                                   | the patterns in that discussion record                                 |
| `/to-pattern mock external endpoints with MSW, one handler module per service` | that pattern                                 |
| `/to-pattern make src/test/member.mother.ts a pattern`    | a pattern drafted from that file, with the file as its exemplar        |
| `/to-pattern` with nothing discussed yet                  | asks what kind of code it's for, then the rules                        |

From a discussion record, Claude picks up the settled decisions marked with a pattern, grouping them into one doc per pattern. Open and deferred decisions are never used; Claude tells you which it skipped.

## Where patterns go

Most patterns go in **`docs/patterns/`**, even when only one service or game uses them so far: a Playwright or MSW pattern should apply to the next project that adds that kind of code. A pattern goes in a scope's own `docs/patterns/` only when that kind of code can't exist anywhere else.

## Confirming the plan

Before writing anything, Claude shows a plan: one entry per pattern, with its name, where it will be written, whether it's new, an update or a move, and its one-line summary. It also shows:

- **the full rules,** when drafting from existing code, because they're Claude's reading of the code and you should check them;
- **the rules that change,** when updating a pattern;
- **the files whose links change,** when moving one.

It flags patterns with no exemplar yet, patterns that fall below the bar for a pattern doc, and any ADRs the pattern depends on that haven't been written. For those, run [to-adr](./to-adr.md) first so the pattern can link them, or go ahead without the link.

If a rule isn't in the conversation, Claude asks rather than making it up. Correct anything in the plan, then confirm.

## What you get

- The new, updated or moved pattern docs, with links to a moved one fixed.
- In the discussion record, each decision used links to its pattern, so it isn't picked up again.

Claude lists every file it created, changed or moved. It doesn't commit. Commit a pattern with the first ticket that uses it, or on its own if no ticket is planned yet.

## What happens next

When a ticket is planned with [plan-ticket](./plan-ticket.md), Claude suggests the patterns that apply from their summaries. The step that uses a pattern for the first time is marked as establishing it; [implement](./implement.md) treats the doc as its spec, and [finish-ticket](./finish-ticket.md) fills in the exemplar once the code exists.

To retire a pattern, ask Claude directly; this command doesn't delete patterns.
