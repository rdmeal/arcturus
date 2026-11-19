---
name: to-pattern
description: Turn agreed coding patterns into pattern docs — from a discussion record, the current conversation, a pattern you describe, or an existing file ("make <file> a pattern") — confirming a plan of which docs go where before writing, updating or moving them.
disable-model-invocation: true
argument-hint: "[pattern, topic or file]"
---

# To pattern

Turn patterns that have already been agreed into pattern docs, or update or move existing ones. This is a write-up, not an interview: the thinking has been done, and the job is to record it faithfully. The only questions you ask are in the confirmation step, unless the user starts with nothing to write up (see "Starting from nothing").

Call the Skill tool with `pattern` first. It defines whether something deserves a pattern, where it goes, the file name, the frontmatter, the body, exemplars and how ADRs are linked. Follow it for every doc you write.

This command writes new patterns, updates existing ones and moves misplaced ones. It doesn't retire patterns; `pattern` says how that's done when the user asks for it.

## 1. Gather the patterns

What the user asked for: $ARGUMENTS

- **A discussion topic:** list the file names in `scratchpad/discussions/` and open only the record whose name matches. If several could match, read the first few lines of each, or ask.
- **"Make `<file>` a pattern"**, or a description naming existing code: the code-first route. Read only the file or files named, and draft the rules from what they do. The named file becomes the exemplar straight away.
- **A description of a pattern** (e.g. "mock external endpoints with MSW, one handler module per service"): that pattern, with the rules and reasoning from the conversation.
- **Nothing:** if a discussion record has been in use in this conversation, use it; otherwise use the patterns agreed in the conversation. If there are none, see "Starting from nothing".

Which decisions to pick up:

- **From a discussion record:** every decision with a `Pattern: <slug>` line and status `settled` or `your call`, **grouped by slug**: each slug becomes one doc. Never use `open` or `deferred` decisions; say which ones you skipped. A slug whose decisions aren't settled enough to give followable rules isn't ready; say so, and suggest picking the discussion back up.
- **From the conversation:** only what the user agreed to. A suggestion of yours that nobody answered is not a rule.

## 2. Check what already exists

Read the `summary` lines of the existing patterns, as `pattern`'s "Finding existing patterns" describes: always `docs/patterns/`, plus the folders of the scopes in play. Then plan each pattern as one of:

- **New:** nothing covers it. Place it with `pattern`'s placement rule.
- **Update:** an existing pattern covers it; open that doc in full and work out which rules are added, changed or removed.
- **Move:** an existing pattern in a scope turns out to apply more widely (or the user asks for a move). Find every file that links to it with a precise search for its path, e.g. `grep -rn 'services/lending/docs/patterns/object-mother.md' .` and the same for its relative forms (`patterns/object-mother.md`). This is a precise search, so you don't need to ask first. Plans in progress under `specs/` may link it too.
- **Skip:** an existing pattern already says this; say so.

Also check the pattern's ADRs: a decision in the record with both `Pattern: <slug>` and `ADR: candidate` (not yet `written`) is an ADR the pattern should link but that doesn't exist yet.

## 3. Confirm the plan

Before writing anything, show the plan:

```
1. Object mothers for test data → docs/patterns/object-mother.md (new)
   Summary: Use when a test needs a domain object it isn't specifically testing — build it with an object mother rather than by hand.
   Exemplar: None yet

2. MSW endpoint mocks → docs/patterns/msw-endpoint-mock.md (moved from services/lending/docs/patterns/)
   Summary: …
   Links to fix: specs/active/loan-reminders/plans/02-send-reminder.md, docs/patterns/object-mother.md
```

- **Code-first route:** show the **full rules** you drafted, not just the summary. They're your reading of the code rather than something the user decided, and an incidental detail of one file shouldn't become a repo-wide rule unnoticed.
- **Updates:** list the rules being added, changed or removed. Existing code may follow the old rule, so that's what needs reviewing.
- **From a discussion record or the conversation:** the summary line is enough; the user agreed the rules already.

Flag anything the user should look at:

- an exemplar that is "None yet";
- a pattern below the bar (say which criterion it misses);
- a placement in a scope rather than `docs/patterns/` (say why it can't exist outside that scope);
- a move, and the files whose links will change;
- **unwritten ADR candidates** for the pattern: recommend running `/to-adr` first so Related can link them. This is a recommendation, not a block; if the user goes ahead, Related is written without the ADR link.

**If a rule is missing or unclear** (the discussion never settled where the files live, say), ask for it here. Never invent rules: a plausible but made-up rule is worse than none, because every future implementer will follow it.

Wait for the user to confirm or correct the plan, then write.

## 4. Write and report

Write, update or move each doc following `pattern`. For a move, `git mv` the file, fix the relative links inside it, then fix every link found in step 2.

Then:

- in the discussion record, if there is one, change each used decision's line to `Pattern: written: [<slug>](relative link)`, so it isn't picked up again;
- list the files you created, changed or moved.

Don't commit, and don't choose the branch. A pattern usually goes in with the first ticket that uses it; one with no ticket planned can go in on its own, with its exemplar still "None yet". The user decides.

## Starting from nothing

If the user runs this with nothing to go on (no arguments, no discussion record, no agreed pattern in the conversation), start a short conversation about the pattern they want:

1. Ask what kind of code the pattern is for.
2. Ask only for what the doc needs and the conversation doesn't already say: when it applies and when it doesn't, the rules (where it lives, naming, shape, what to avoid), and an exemplar if one exists. Ask these together, in one message, rather than one at a time.
3. Then continue from step 2 above.

This is a short gathering of rules the user has already decided, not a design discussion. If it turns out the pattern isn't actually decided yet, suggest `/grill-me-with-docs` to work it through first.
