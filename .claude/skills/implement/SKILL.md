---
name: implement
description: Work through a ticket's plan one step at a time — take the first unticked step, read only what it names, write the code and its tests, run its check, tick it, then stop so the developer can review and commit.
disable-model-invocation: true
argument-hint: "[plan path | feature NN] [--steps N]"
---

# Implement

Carry out a plan written by `/plan-ticket`, **one step at a time**. Each step is commit-sized and keeps the build green. After each step you stop, so the developer can review the diff and commit it before the next one starts. Any session can pick up a half-done plan, because the plan says what is done (ticked steps), what comes next (the first unticked step) and what earlier sessions learned (Notes).

**Keep this session cheap.** The planning session already decided what each step needs to read. Trust it: read what the step names, not the codebase at large. If the step turns out to need more, that is worth knowing, and often worth a line in Notes so the next session doesn't rediscover it.

## 1. Find the plan

What the user asked for: $ARGUMENTS

- **A plan path, or a feature and number** (`tournament-seeding 02`): that plan, in `specs/active/<feature>/plans/`.
- **Nothing:** the plan discussed in this conversation, if there is one. Otherwise, work it out from the current branch name, `ticket/<feature>-NN-<slug>`. If neither works, list the plans in `specs/active/*/plans/` that still have unticked boxes, and ask which one.
- **`--steps N`:** run up to N steps in a row before stopping (default 1). Still stop early when a step fails or needs the developer's decision (see steps 5 and 6).

If the plan has no unticked boxes, say so and suggest `/finish-ticket`.

## 2. Check git

- **The branch** should be the plan's branch, `ticket/<feature>-NN-<slug>`. If it isn't, say what you see and ask.
- **Uncommitted changes:** show `git status --short` and ask whether they're the previous step not yet committed, or work the developer wants kept as part of this step. Committing first keeps each step its own diff. Never stash, reset or discard anything.

## 3. Read

- **The plan, in full.** Notes can change what a step means, and Context explains the choices behind it.
- **The step's Read first:** the patterns, ADRs and docs it names, and nothing else from Context.
- **The step's Files:** the files it changes, and the existing tests next to them.

Beyond that:

- **Code:** you may read files named directly from the ones above, such as a module they import or the type they use. Don't search broadly (grep across the repo, list directory trees, spawn an Explore agent) without asking first. Ask briefly and say why, e.g. "I'd like to search for callers of `scoreRound`, because the step changes its signature". The developer usually knows the answer.
- **Glossaries:** the plan already names the types, functions and test cases. Read `docs/GLOSSARY.md`, or a scope's glossary (found through `docs/CONTEXT-MAP.md`), only when you have to name something the plan doesn't.

## 4. Do the step

- **Behaviour steps go test-first.** Write the test cases the step names, run them and see them fail for the right reason, then write the code that makes them pass. A test that passes before the code exists proves nothing.
- **Write only the test cases the step names, and test behaviour, not internals.** Go through the public interface of the thing being tested, the way a caller would use it, so the tests survive refactoring. If you think more cases are needed, say so in the report rather than adding them quietly; red-green is a reason to write the planned tests first, not to write more of them.
- **Prefactor steps** change no behaviour. Run the existing tests before and after, and both runs should pass.
- **Documentation steps** have no tests. Write the doc the step names.
- **Follow the patterns the step names.** A pattern doc points at an exemplar file; follow it the way the exemplar does, not from memory.
- **Use the names the plan gives.** Changing a public name or signature that later steps depend on is a deviation (see 6).

## 5. Run the check

Run the step's **Check** command. Only that: the full checks (lint, the whole test suite, the build) run in `/finish-ticket`.

- **It passes:** tick the step's box in the plan.
- **It fails:** fix your code and run it again. **Stop and report**, with the failure output, when:
  - the fix needs a change outside this step;
  - the failure suggests the plan itself is wrong;
  - about three attempts have made no progress.

  Leave the step unticked. A ticked box tells every later session that the step is done and green, so it must never be ticked on hope.

## 6. Deviations

Plans are written before the code, so some detail will be off. Decide which kind of deviation it is:

- **Small, within the step's goal: carry on**, and mention it in the report. For example, a private helper, an extra import, touching a file the plan missed because the goal needs it, or a different name for something local.
- **Changes the plan: stop and ask.** For example, the step's goal has to change, a public name or signature that later steps rely on has to change, steps need adding, removing, splitting or reordering, or the plan goes against an ADR or a chosen pattern.

Once the developer agrees a change, update the **unticked** steps to match and add a dated line to Notes. Never rewrite a ticked step; it describes work already committed.

**Notes are for later sessions,** not a log (the commits are the log). Add a dated line when you learn something a later step or session needs, such as "the referee API returns rounds unsorted; step 4 must sort them", or when the plan changes. For example:

```md
- 2026-11-16: Step 3 also touches `round-store.ts`: rounds must be saved with their outcome, which the plan missed.
```

## 7. The acceptance-criteria step

The plan's last step has one box per criterion, each with the test that proves it at the test boundary.

- For each criterion, run its test and tick the box when it passes.
- If the named test doesn't exist yet, write it at the test boundary, then run it.
- If a criterion can't be proven as planned (the test can't be written at the boundary, or it fails and the fix isn't small), stop and ask.

## 8. A step done elsewhere

If the developer says a step was done outside this session (by hand, or by an agent given a `/to-agent-task` brief), check it rather than trusting it. This session stays the plan's only writer.

- **An agent's report:** a brief at `scratchpad/agent-tasks/<feature>-NN-step-K.md` (or `…-steps-K-M.md` for a run) has its report next to it, as `….report.md`. Read it first. It says which steps the agent finished, what it changed, its deviations and its questions. Treat it as the agent's claim, not as proof.
- **For each step done:** look at the diff against the step's goal and Files, run the step's Check, and tick the step only if it passes. Report any gap between the diff and the step, and any deviation that changes the plan (see 6).
- **Suggested notes** from the report go into the plan's Notes only once you've checked them against the diff.
- **Questions and stopped steps** from the report go to the developer.

## 9. Report

After each step (or after the last of `--steps N`), stop and report:

```
**Step 2: Score a draw as half a point to each player** ✅ ticked

Changed:
- `src/scoring/score-round.ts`: draws score 0.5 each
- `src/scoring/score-round.test.ts`: 2 tests (`scores a draw as half a point each`, `…`)

Check: `pnpm --filter scoring test` (passed)

Deviations: none
Notes added: none

Suggested commit: `feat: score a draw as half a point to each player`

Next: **Step 3: Show draws in the standings**
```

- **Suggested commit** uses the repo's conventional-commit style (`feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`). Don't commit; the developer reviews and commits.
- **When a step stops unticked,** say why, show the relevant part of the failure output, and say what you need from the developer.
- **When the last box is ticked,** say the plan is complete and suggest `/finish-ticket`.
