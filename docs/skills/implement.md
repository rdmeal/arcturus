---
type: skill-guide
---

# implement

Builds a ticket by working through its plan from [plan-ticket](./plan-ticket.md), one step at a time. After each step it stops so you can review the diff and commit it. Any session can carry on a half-done plan, because the plan records which steps are done and what earlier sessions learned.

## When to use it

Once a ticket has a plan and you've committed it. Use it again for each step until the plan is complete, then use `/finish-ticket`.

## How to use it

| You type                                | Claude does                                                     |
| --------------------------------------- | --------------------------------------------------------------- |
| `/implement`                            | the next step of the plan discussed in the conversation, or else the plan for the current `ticket/…` branch |
| `/implement tournament-seeding 02`      | the next step of that ticket's plan                             |
| `/implement specs/active/…/plans/02-….md` | the next step of that plan                                      |
| `/implement --steps 3`                  | up to three steps in a row, stopping early if one fails or needs your decision |
| `/implement --mode orchestrate`         | the next step, done by a Sonnet subagent, without asking who should do it |

If it can't work out the plan, it lists the plans that still have steps left and asks.

## Who does the step

Unless you pass `--mode`, Claude asks who should do the step, and recommends one:

- **direct:** Claude does it in this session. Best for steps that need your judgement as they go, like the first code to follow a new pattern, or a step too small to be worth briefing.
- **orchestrate:** Claude writes a brief (the same one [to-agent-task](./to-agent-task.md) writes) and hands it to a Sonnet subagent. Then it checks the subagent's diff, runs the step's check itself and ticks the step only if it passes. Questions that would change the plan still come to you. Best for well-defined steps, and for `--steps N` runs, because it keeps the main session's context small. Subagents run one at a time, since they share your working tree.
- **brief:** Claude runs `/to-agent-task`, which writes a brief for you to give to any agent, Claude or not. When it's done, run `/implement` again and say the step was done by an agent.

## Before it starts

It checks that you're on the plan's branch. If there are uncommitted changes, it asks whether they're the previous step (commit them first, so each step is its own diff) or work to keep in this step. It never stashes or discards anything.

## What Claude reads

In orchestrate mode, Claude reads the plan and leaves the rest to the subagent. Otherwise:

- The plan, including its Notes.
- The patterns, ADRs and docs that the step's "Read first" names.
- The files the step changes, the tests next to them, and files it can name directly from those.

It asks before searching more widely.

## Each step

- **Behaviour steps go test-first:** the step's test cases are written and seen to fail, then the code is written to make them pass. Only the test cases the plan names are written, and they test behaviour through the public interface. If Claude thinks more tests are needed, it says so rather than adding them.
- **Prefactor steps** keep the existing tests passing.
- **The step's check** is run. The step is ticked in the plan only when the check passes. If it keeps failing, Claude stops and shows you the output.
- **Patterns** are followed by their rules, and by their exemplar file where they have one. On a step that establishes a pattern (the first code to follow it), Claude may fill gaps in the pattern doc and report them, so the doc and its first example agree; changing an agreed rule stops for your decision. A pattern Claude notices that the plan didn't name goes into the plan's Notes as a possible pattern, for later.
- **Small deviations** (a helper, an extra import, a file the plan missed) are made and reported. **Anything that changes the plan** (a step's goal, a name later steps rely on, adding or reordering steps, going against an ADR or pattern) stops for your decision. Agreed changes go into the unticked steps and a dated line in the plan's Notes. Ticked steps are never rewritten.

## What you get after each step

- The step ticked in the plan, or the reason it wasn't.
- Who did it: this session, a Sonnet subagent, or an agent from a brief.
- The changed files, the check and its result, and any deviations or notes added.
- A suggested commit message.
- The title of the next step.

Claude doesn't commit. Review the diff, commit, then run `/implement` again, in this session or a fresh one.

If a step was done outside the session (by hand, or by an agent), tell Claude. It checks the diff against the step, runs the step's check and ticks the step if it passes.
