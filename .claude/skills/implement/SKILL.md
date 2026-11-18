---
name: implement
description: Work through a ticket's plan one step at a time — take the first unticked step, ask who does it (this session directly, this session orchestrating Sonnet subagents, or a /to-agent-task brief for any other agent), get the code and its tests written, run its check, tick it, then stop so the developer can review and commit.
disable-model-invocation: true
argument-hint: "[plan path | feature NN] [--steps N] [--mode direct|orchestrate|brief]"
---

# Implement

Carry out a plan written by `/plan-ticket`, **one step at a time**. Each step is commit-sized and keeps the build green. After each step you stop, so the developer can review the diff and commit it before the next one starts. Any session can pick up a half-done plan, because the plan says what is done (ticked steps), what comes next (the first unticked step) and what earlier sessions learned (Notes).

A step can be done in three ways, and you ask the developer which one each time (section 2):

- **direct:** this session writes the code (sections 4 to 8).
- **orchestrate:** this session briefs a Sonnet subagent per step, checks its work and ticks the step (section 9).
- **brief:** this session hands off to `/to-agent-task`, which writes a brief any agent can follow, Claude or not. The developer runs it, and a later `/implement` checks it (section 10).

**Keep this session cheap.** The planning session already decided what each step needs to read. Trust it: read what the step names, not the codebase at large. If the step turns out to need more, that is worth knowing, and often worth a line in Notes so the next session doesn't rediscover it. When orchestrating, read even less: the subagent does the reading.

## 1. Find the plan

What the user asked for: $ARGUMENTS

- **A plan path, or a feature and number** (`tournament-seeding 02`): that plan, in `specs/active/<feature>/plans/`.
- **Nothing:** the plan discussed in this conversation, if there is one. Otherwise, work it out from the current branch name, `ticket/<feature>-NN-<slug>`. If neither works, list the plans in `specs/active/*/plans/` that still have unticked boxes, and ask which one.
- **`--steps N`:** run up to N steps in a row before stopping (default 1). Still stop early when a step fails or needs the developer's decision (see sections 6 and 7).
- **`--mode direct|orchestrate|brief`:** who does the steps. It skips the question in section 2.

If the plan has no unticked boxes, say so and suggest `/finish-ticket`.

If the developer says a step was already done elsewhere (by hand, or by an agent from a brief), skip section 2 and go to section 10.

## 2. Choose who does the steps

Unless `--mode` was given, ask with the AskUserQuestion tool, naming the step(s) about to run. Put your recommendation first and say why in a few words:

- **Orchestrate:** recommend it for well-defined steps that don't need the developer's judgement as they go: a prefactor, a step that follows an existing pattern closely, a documentation step with clear content, and runs of several such steps (`--steps N`). It keeps this session's context small, because the subagent does the reading and the coding.
- **Direct:** recommend it when the step needs judgement or close guidance: a step with **Establishes** (the pattern doc may need gaps filled), a step whose Notes or Context leave something open, a step small enough that briefing it costs more than doing it, or a step that needs something only this session can do (such as a check the developer has to run with `!`).
- **Brief:** for running the step outside this session, on another tool or model (including non-Claude agents), or in parallel with other work.

If a mode was chosen earlier in this conversation for this plan, offer it as the recommendation, but still ask. The mode applies to every step in this run.

- **Brief:** call the Skill tool with `to-agent-task`, passing the plan and the steps (`step K`, or `steps K-M` for `--steps N`). It does its own git check and writes the brief. Stop when it reports; there's nothing to tick yet.
- **Direct or orchestrate:** carry on with section 3.

## 3. Check git

- **The branch** should be the plan's branch, `ticket/<feature>-NN-<slug>`. If it isn't, say what you see and ask.
- **Uncommitted changes:** show `git status --short` and ask whether they're the previous step not yet committed, or work the developer wants kept as part of this step. Committing first keeps each step its own diff. Never stash, reset or discard anything.

## 4. Read

Sections 4 to 8 are for **direct** mode. In orchestrate mode, go to section 9.

- **The plan, in full.** Notes can change what a step means, and Context explains the choices behind it.
- **The step's Read first:** the patterns, ADRs and docs it names, and nothing else from Context.
- **The step's Files:** the files it changes, and the existing tests next to them.

Beyond that:

- **Code:** you may read files named directly from the ones above, such as a module they import or the type they use. Don't search broadly (grep across the repo, list directory trees, spawn an Explore agent) without asking first. Ask briefly and say why, e.g. "I'd like to search for callers of `scoreRound`, because the step changes its signature". The developer usually knows the answer.
- **Glossaries:** the plan already names the types, functions and test cases. Read `docs/GLOSSARY.md`, or a scope's glossary (found through `docs/CONTEXT-MAP.md`), only when you have to name something the plan doesn't.

## 5. Do the step

- **Behaviour steps go test-first.** Write the test cases the step names, run them and see them fail for the right reason, then write the code that makes them pass. A test that passes before the code exists proves nothing.
- **Write only the test cases the step names, and test behaviour, not internals.** Go through the public interface of the thing being tested, the way a caller would use it, so the tests survive refactoring. If you think more cases are needed, say so in the report rather than adding them quietly; red-green is a reason to write the planned tests first, not to write more of them.
- **Prefactor steps** change no behaviour. Run the existing tests before and after, and both runs should pass.
- **Documentation steps** have no tests. Write the doc the step names.
- **Follow the patterns the step names:** their rules, and their exemplar file where they have one, not your own habits.
- **A step with Establishes** is the first code to follow that pattern, so the doc is the spec and there's no exemplar yet. Implementing it often shows where the rules fall short:
  - **A gap or clarification** that doesn't change what a rule says (a naming detail the rules didn't cover, a case they didn't mention): edit the pattern doc on this branch, and list the change in the report. The doc and its first exemplar should merge in agreement.
  - **A change to an agreed rule:** stop and ask, as for any change to the plan. The developer agreed those rules.
- **A pattern you notice that the plan didn't name** (you're writing something that later code should do the same way): don't write it up mid-step. Add a dated `Possible pattern: <what, and which file shows it>` line to the plan's Notes, and mention it in the report.
- **Use the names the plan gives.** Changing a public name or signature that later steps depend on is a deviation (see 7).

## 6. Run the check

Run the step's **Check** command. Only that: the full checks (lint, the whole test suite, the build) run in `/finish-ticket`.

- **It passes:** tick the step's box in the plan.
- **It fails:** fix your code and run it again. **Stop and report**, with the failure output, when:
  - the fix needs a change outside this step;
  - the failure suggests the plan itself is wrong;
  - about three attempts have made no progress.

  Leave the step unticked. A ticked box tells every later session that the step is done and green, so it must never be ticked on hope.

## 7. Deviations

Plans are written before the code, so some detail will be off. Decide which kind of deviation it is:

- **Small, within the step's goal: carry on**, and mention it in the report. For example, a private helper, an extra import, touching a file the plan missed because the goal needs it, or a different name for something local.
- **Changes the plan: stop and ask.** For example, the step's goal has to change, a public name or signature that later steps rely on has to change, steps need adding, removing, splitting or reordering, or the plan goes against an ADR or a chosen pattern.

Once the developer agrees a change, update the **unticked** steps to match and add a dated line to Notes. Never rewrite a ticked step; it describes work already committed.

**Notes are for later sessions,** not a log (the commits are the log). Add a dated line when you learn something a later step or session needs, such as "the referee API returns rounds unsorted; step 4 must sort them", or when the plan changes. For example:

```md
- 2026-11-16: Step 3 also touches `round-store.ts`: rounds must be saved with their outcome, which the plan missed.
```

## 8. The acceptance-criteria step

The plan's last step has one box per criterion, each with the test that proves it at the test boundary.

- For each criterion, run its test and tick the box when it passes.
- If the named test doesn't exist yet, write it at the test boundary, then run it.
- If a criterion can't be proven as planned (the test can't be written at the boundary, or it fails and the fix isn't small), stop and ask.

## 9. Orchestrate: one Sonnet subagent per step

This session is the orchestrator. It briefs, checks and ticks; the subagent reads and writes the code. The brief and report are the same files `/to-agent-task` uses, so the work leaves the same record whichever way it was done, and a later session can check it the same way.

**Read** the plan in full, and keep in mind what the developer said in this conversation: it isn't on disk, so the brief is the only way the subagent learns it. Don't read the step's Files, patterns or ADRs; the subagent reads those. Read a file only when the brief would be ambiguous without it.

**For each step, in order:**

1. **Note the starting point:** `git status --short`, so that in a run you can tell this step's changes from the earlier steps' uncommitted ones.
2. **Write the brief** to `scratchpad/agent-tasks/<feature>-NN-step-K.md`. Read `.claude/skills/to-agent-task/SKILL.md` for its "Write the brief" rules and "Task file template", and follow them; don't copy the template from memory. One brief per step, even in a run, so that each step is checked before the next one is briefed. In a run, add to the brief's Context which files the earlier steps changed, and that their uncommitted changes are expected.
3. **Spawn the subagent** with the Agent tool: `subagent_type: "general-purpose"`, `model: "sonnet"`, no worktree isolation (the work has to land on this branch), and a prompt like "Do the task in `scratchpad/agent-tasks/<file>.md`. End with the report's path and a one-line status." Wait for it to finish. Run one subagent at a time: subagents in the same working tree would edit each other's files and run each other's checks.
4. **Check its work** as in section 10: read the report, look at this step's diff against the step's goal and Files, and run the step's Check yourself. Tick the step only if it passes.
5. **If it falls short,** send it back with SendMessage (it keeps its context, so a new brief isn't needed), giving the failing output or the gap between the diff and the step. After about two rounds without progress, stop and report.
6. **If it stopped with a question:**
   - **A small deviation within the step's goal,** or something the plan or this conversation already answers: answer it with SendMessage, and mention it in the report.
   - **Anything that changes the plan** (see 7): stop and ask the developer. Once they've answered, continue the same subagent with SendMessage.

Only move on to the next step once this one is ticked. The plan has one writer, this session: the subagent never edits it.

## 10. A step done elsewhere

If the developer says a step was done outside this session (by hand, or by an agent given a `/to-agent-task` brief), check it rather than trusting it. Orchestrate mode checks its subagents' work the same way. This session stays the plan's only writer.

- **An agent's report:** a brief at `scratchpad/agent-tasks/<feature>-NN-step-K.md` (or `…-steps-K-M.md` for a run) has its report next to it, as `….report.md`. Read it first. It says which steps the agent finished, what it changed, its deviations and its questions. Treat it as the agent's claim, not as proof.
- **For each step done:** look at the diff against the step's goal and Files, run the step's Check, and tick the step only if it passes. Report any gap between the diff and the step, and any deviation that changes the plan (see 7).
- **Pattern doc edits** by the agent (on a step with Establishes) must only fill gaps. If one changes what an agreed rule says, treat it as a deviation that changes the plan.
- **Suggested notes** from the report go into the plan's Notes only once you've checked them against the diff. That includes `Possible pattern:` lines.
- **Questions and stopped steps** from the report go to the developer.

## 11. Report

After each step (or after the last of `--steps N`), stop and report:

```
**Step 2: Score a draw as half a point to each player** ✅ ticked

Done by: Sonnet subagent (brief: `scratchpad/agent-tasks/tournament-seeding-02-step-2.md`)

Changed:
- `src/scoring/score-round.ts`: draws score 0.5 each
- `src/scoring/score-round.test.ts`: 2 tests (`scores a draw as half a point each`, `…`)

Check: `pnpm --filter scoring test` (passed)

Deviations: none
Notes added: none

Suggested commit: `feat: score a draw as half a point to each player`

Next: **Step 3: Show draws in the standings**
```

- **Done by** is `this session`, `Sonnet subagent (brief: …)` or `agent (brief: …)` for a step done elsewhere. In orchestrate mode, also give any questions you answered for the subagent, and any extra tests it suggested.
- **Suggested commit** uses the repo's conventional-commit style (`feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`). Don't commit; the developer reviews and commits.
- **When a step stops unticked,** say why, show the relevant part of the failure output, and say what you need from the developer.
- **When the last box is ticked,** say the plan is complete and suggest `/finish-ticket`.
