---
type: skill-guide
---

# finish-ticket

Closes off a ticket once its plan is complete and you've reviewed the work. It makes sure nothing is unfinished, runs the full checks, marks the ticket done, archives the feature if this was its last ticket, and writes the PR. Once you've pushed, it can open the PR for you.

It's a final gate, not a code review. The acceptance criteria were proven in the plan's last step, and you reviewed each step as [implement](./implement.md) finished it.

## When to use it

When every step of the plan is ticked and you've committed the work.

## How to use it

| You type                               | Claude finishes                                  |
| -------------------------------------- | ------------------------------------------------ |
| `/finish-ticket`                       | the ticket in the conversation, or else the ticket for the current `ticket/…` branch |
| `/finish-ticket tournament-seeding 02` | that ticket                                      |

## What it does

1. **Checks git:** you're on the ticket's branch with nothing uncommitted. It tells you if `main` has moved on, so you can rebase or merge first.
2. **Checks the plan is complete:** every step and every acceptance criterion is ticked. If any aren't, it lists them and suggests `/implement`. A step you agree is no longer needed is removed from the plan, with a note saying why. An acceptance criterion can't be dropped here.
3. **Runs the full checks:** lint, typecheck, tests and build. It takes the commands from `CLAUDE.md` or the root `package.json`, or asks you. It runs all of them, so you see every failure at once. If any fail, it stops before changing anything.
4. **Sets statuses:** the ticket becomes `done`. If every other ticket in the feature is done or cancelled on `main`, the spec becomes `done` too, and the feature folder moves from `specs/active/` to `specs/archive/`. It finds links to the old folder and offers to fix them.
5. **Flags follow-ups:** decisions in the plan that look worth an ADR (use [to-adr](./to-adr.md)), and possible patterns still to write up.
6. **Writes the PR:** a title, plus a body saved to `scratchpad/pr-bodies/<feature>-NN.md`. The body has the summary, links to the ticket and plan, the steps, each acceptance criterion with its test, any deviations, the checks and the follow-ups.

Then it stops with a suggested commit message for the status changes. **You commit and push** from your own terminal.

## Opening the PR

Tell Claude when you've pushed. It checks the branch is up to date on GitHub, asks whether you want a draft or ready PR, and runs `gh pr create`. If a PR already exists, it offers to update its description instead. If the sandbox blocks GitHub, it gives you the command to run.

## Running it again

It's safe to rerun, for example after fixing a failing check. It skips anything already done and rewrites the PR body.

If two tickets that are the last in their feature finish at the same time, each may see the other as unfinished, and the feature won't be archived. Move the folder to `specs/archive/` by hand if that happens.
