---
name: to-agent-task
description: Hand one plan step, or a run of consecutive steps, to a cheaper model — write a self-contained task brief to scratchpad/agent-tasks/ that another session follows, reporting back through a report file that /implement then checks.
disable-model-invocation: true
argument-hint: "[plan path | feature NN] [step K | steps K-M]"
---

# To Agent Task

Write a **task brief** that lets another session, usually on a cheaper model, carry out one step of a plan, or a run of consecutive steps. Think of this session as an **orchestrator** briefing an implementer, with a markdown file as the message bus instead of a spawned subagent:

- **The brief carries what the implementer can't get for itself:** the intent, the decisions made in planning and in this conversation, the boundaries of the work, what counts as done, and the shape of the reply. The implementer starts with no context, so all of this has to be written down.
- **The brief points at everything on disk.** Give paths and symbol names, and let the implementer do the reading. Its reading is cheap and this session's isn't. If you read every file to copy it into the brief, you pay the expensive tokens and delegating saves little.
- **The reply is a claim, not a fact.** The implementer writes a report file, and `/implement` checks the work before anything is ticked. The plan has one writer, and it isn't the implementer.

The developer starts the implementer session themselves. Spawn a subagent (with `model: sonnet`) only if the developer asks. `/implement`'s orchestrate mode does that routinely: it writes briefs from this skill's template, runs each one as a Sonnet subagent and checks the result.

## 1. Find the plan and the steps

What the user asked for: $ARGUMENTS

- **The plan:** a plan path, or a feature and number (`tournament-seeding 02`), in `specs/active/<feature>/plans/`. With no plan given, use the plan discussed in this conversation, or else the one for the current branch, `ticket/<feature>-NN-<slug>`. If neither works, list the plans in `specs/active/*/plans/` that still have unticked boxes, and ask.
- **The steps:** `step K`, or `steps K-M` for a run of consecutive steps.
- **No steps given:** propose which unticked steps to hand over and how to split them (see "Splitting" below), and agree it with the developer before writing anything.

## 2. Check the steps can be delegated

- **A ticked step:** refuse it; it's done.
- **An earlier step is still unticked:** warn. A step usually builds on the ones before it. Carry on only if the developer says they're independent.
- **Any other step** can be delegated, including the acceptance-criteria step.

### Splitting

- **One task file per step, or per run of consecutive steps.**
- **Steps that don't depend on each other** get separate files, so they can run in parallel.
- **Steps that depend on each other** go in one file as a run, or the next brief is written only after the previous one has been checked. Warn if the developer wants to run dependent steps in parallel.
- **A run has no commit between its steps** (as with `/implement --steps N`), so the developer reviews it as one diff. Keep runs short.

## 3. Check git

- **The branch** should be the plan's branch, `ticket/<feature>-NN-<slug>`. If it isn't, say what you see and ask.
- **Uncommitted changes:** show `git status --short` and ask. The implementer should start from a committed state, so that its diff is only its own work. Never stash, reset or discard anything.

Record the branch and the current commit (`git rev-parse --short HEAD`) for the brief.

## 4. Read

- **The plan, in full.** You need its Context and Notes to know what applies to these steps.
- **What you already know from this conversation.** Decisions and preferences the developer stated here aren't on disk, so they're the most valuable thing the brief carries.

**Don't read the steps' Files, patterns or ADRs.** The implementer reads those. Read a file only when the brief would be ambiguous without it, for example to name the right symbol when the step names a file but not what in it to change. Don't search broadly without asking.

## 5. Write the brief

Write `scratchpad/agent-tasks/<feature>-NN-step-K.md`, or `<feature>-NN-steps-K-M.md` for a run, using the template below.

What goes in, and how:

- **Copied in:** each step as the plan writes it (its goal, Files, Tests and Check). Also the Context lines that apply (the test boundary, the relevant planning decisions), the Notes that affect these steps, and anything from this conversation that does.
- **Pointed at:** the patterns, ADRs, exemplar files and code the steps need, as a path plus a symbol name where there is one, with a line on why each matters. Use the step's Read first as the list. When a step has an **Establishes** line, say in its Read first entry that this step establishes the pattern. Give line numbers only if you already know them; symbol names survive edits, line numbers don't.
- **Left out:** the path to the plan file. The implementer gets the steps from the brief, so it doesn't read or drift into other steps. Also left out: glossaries, because the plan already gives the names.
- **"Why it matters"** is one sentence on how the steps fit the ticket. An implementer that knows the goal makes better small decisions.

Keep the brief to roughly a screen for one step. If it's much longer, you're probably copying something the implementer could read for itself.

## 6. Report

- The task file's path.
- A command to start the implementer, e.g. `claude --model sonnet "Do the task in scratchpad/agent-tasks/tournament-seeding-02-step-3.md"`.
- Next: when it's done, review the diff, then run `/implement` and say the step was done by an agent. `/implement` reads the report, checks each step and ticks the ones that pass. The developer commits after that.

## Task file template

The fixed parts (How to work, Don't touch, Report) are written for whichever model runs the task, so keep them as they are. Fill in the rest.

````md
# Task: {feature} ticket NN, step K: {step title}

You're implementing part of a planned ticket in this repo. Everything you need is in this file or linked from it. Do the work, then write your report to `{this file's path, with .md replaced by .report.md}` in the format at the end.

- **Branch:** `ticket/{feature}-NN-{slug}` (written against commit `{short hash}`; if HEAD has moved, find code by symbol name and mention it in your report)
- **Why it matters:** {one sentence: what the ticket delivers and how these steps fit}

## Context

- **Test boundary:** {from the plan's Context}
- {planning decisions, Notes and conversation context that affect these steps; "none" if none}

## Steps

### Step K: {title}

- **Goal:** {from the plan}
- **Files:** {from the plan}
- **Tests:** {from the plan}
- **Check:** `{from the plan}`
- **Read first:**
  - `{path}` ({symbol}, if any): {why it matters for this step}

{Repeat for each step in a run. Do them in order.}

## How to work

- **Behaviour steps go test-first.** Write the test cases the step names, run them and see them fail for the right reason, then write the code that makes them pass.
- **Write only the test cases the step names, and test behaviour through the public interface,** the way a caller would use it. If you think more tests are needed, say so in the report instead of adding them.
- **Prefactor steps change no behaviour:** the existing tests pass before and after.
- **Follow the patterns you're pointed at:** their rules, and their exemplar file where they have one.
- **A step that establishes a pattern** is the first code to follow it, so the pattern doc is your spec. You may fill a gap in the doc that doesn't change what a rule says (e.g. a naming detail it didn't cover); list it under Changed. If an agreed rule itself seems wrong, stop and report it instead of changing it.
- **If you write something later code should do the same way,** and no pattern you were pointed at covers it, add `Possible pattern: {what, and which file shows it}` under Suggested notes. Don't write a pattern doc.
- **Use the names the step gives.**
- **Run only the step's Check.** If it fails, fix your code and run it again. Stop after about three attempts without progress.
- **Small deviations within a step's goal are fine** (a private helper, an extra import, a file the step missed because the goal needs it); list them in the report. **Anything that would change the plan** (the goal, a public name or signature, adding or reordering steps, going against a pattern or ADR) means: stop, and report it instead.
- **In a run of steps, stop at the first step that fails or needs a decision.** Don't start the next one.

## Don't touch

- Any plan file in `specs/`.
- Files outside the steps' Files, except small changes the goal needs, which you report.
- Git: no commits, branch switches, stashes or resets. Leave your changes uncommitted.
- Dependencies: add none.
- {anything specific to these steps, e.g. "step 4's standings view; another agent is doing it"}

## Report

Write your report to `{report path}`, with one section per step you started:

```md
# Report: {feature} ticket NN, step K

## Step K: {title}

- **Status:** done | stopped ({why})
- **Changed:** `{path}`: {what changed}, …
- **Check:** `{command}`: passed | failed ({the key lines of output})
- **Deviations:** {small deviations made, or "none"}
- **Suggested notes:** {anything a later step or session needs to know, or "none"}
- **Questions:** {decisions you need, or "none"}
- **Extra tests suggested:** {or "none"}
```
````
