---
type: skill-guide
---

# to-agent-task

Hands one step of a plan, or a run of consecutive steps, to a cheaper model. Claude writes a short, self-contained task brief to `scratchpad/agent-tasks/`. You start another session (e.g. on Sonnet) and give it the brief. The agent does the work and writes a report next to the brief. [implement](./implement.md) then checks the work and ticks the steps.

Claude works like an orchestrator briefing an implementer. The brief carries what the agent can't find for itself: the goal, the decisions from planning and from your conversation, the boundaries of the work and how to report back. It points at the code, patterns and ADRs rather than copying them, because the cheaper model's reading costs less than Claude's.

## When to use it

During [implement](./implement.md), for steps that are well defined and don't need your judgement as they go: a prefactor, a step that follows an existing pattern closely, or a documentation step.

## How to use it

| You type                                     | Claude writes a brief for                                   |
| -------------------------------------------- | ----------------------------------------------------------- |
| `/to-agent-task tournament-seeding 02 step 3` | step 3 of that ticket's plan                                |
| `/to-agent-task steps 3-4`                   | steps 3 and 4 as one run, for the plan of the current branch |
| `/to-agent-task`                             | proposes which steps to hand over and how to split them, and asks you |

The plan is found as in `implement`: the one discussed in the conversation, or else the plan for the current `ticket/…` branch.

- **Steps that don't depend on each other** get separate briefs, so you can run them in parallel.
- **Steps that depend on each other** go in one brief as a run. The agent stops at the first step that fails or needs a decision. There's no commit between the steps of a run, so keep runs short.

Claude won't delegate a step that's already ticked, and warns if an earlier step isn't done yet.

## Before it writes

It checks you're on the plan's branch with nothing uncommitted, so the agent's diff holds only its own work. The brief records the branch and commit it was written against.

## Running the agent

Claude gives you a command to copy, for example:

```
claude --model sonnet "Do the task in scratchpad/agent-tasks/tournament-seeding-02-step-3.md"
```

The agent follows the same rules as `implement`: test-first, only the tests the plan names, and only the step's check. It doesn't touch the plan, commit, or add dependencies. If the plan doesn't fit the code, it stops and reports instead of improvising.

It writes its report to the same path with `.report.md`. The report has a section per step, giving the status, the changed files, the check result, any deviations, suggested notes and questions.

## Afterwards

Review the diff, then run `/implement` and say the step was done by an agent. `implement` reads the report, checks each step against the diff, runs its check and ticks it if it passes. Then commit.

If you'd rather not start the session yourself, ask Claude to run the brief as a subagent instead.
