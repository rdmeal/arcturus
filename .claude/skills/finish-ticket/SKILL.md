---
name: finish-ticket
description: Close off a ticket whose plan is complete — check every box is ticked and the full checks pass, set the ticket (and spec) to done, archive a finished feature, fill in the exemplar of any pattern the ticket established, flag ADR-worthy decisions and possible patterns, write the PR body, and open the PR once the developer has pushed.
disable-model-invocation: true
argument-hint: "[plan path | feature NN]"
---

# Finish Ticket

Close off a ticket the developer has built and reviewed. This is a **mechanical gate, not a review**. The acceptance criteria were proven in the plan's last step, and the developer has reviewed every step. What's left is to make sure nothing is unfinished, set the statuses, and turn the ticket and plan into a PR.

**Keep it cheap.** The plan and commits already say what changed. Don't read the full diff or re-review the code. The developer reviews the code in the PR.

**Safe to rerun.** A run may stop on a failing check, or the developer may come back after pushing. On every run, skip what's already done (a ticket already `done`, a folder already archived), rewrite the PR body, and carry on from there.

## 1. Find the plan

What the user asked for: $ARGUMENTS

- **A plan path, or a feature and number** (`tournament-seeding 02`): that plan, in `specs/active/<feature>/plans/`, or in `specs/archive/<feature>/plans/` if an earlier run already archived it.
- **Nothing:** the plan discussed in this conversation, if there is one. Otherwise, the one for the current branch, `ticket/<feature>-NN-<slug>`. If neither works, ask.

## 2. Check git

- **The branch** must be the plan's branch, `ticket/<feature>-NN-<slug>`. If it isn't, stop and say so.
- **Uncommitted changes:** stop and ask. The checks should run against what will actually be pushed. The exception is this skill's own changes from an earlier run (statuses, an archive move, link fixes, exemplars filled in), which the developer may not have committed yet. Say that's what you see and carry on.
- **`main` has moved ahead** (`git log HEAD..main --oneline` isn't empty): mention it, so the developer can rebase or merge before pushing. Don't do either yourself.

## 3. Check the plan is complete

Read the plan. Every checkbox must be ticked, including each acceptance criterion.

- **Unticked boxes:** stop, list them, and suggest `/implement`.
- **A step the developer agrees is no longer needed:** remove it from the plan and add a dated line to Notes saying why. Don't tick it; a tick claims the work was done.
- **An acceptance criterion can't be dropped here.** That would change what the ticket promises. Stop and say so; the ticket has to change first.

## 4. Run the full checks

Find the commands, in this order:

1. `docs/develop/commands.md` (imported into `CLAUDE.md`);
2. the root `package.json` scripts that clearly fit (`lint`, `typecheck`, `test`, `build`);
3. otherwise, ask the developer.

Run **every** check, even after one fails, so the developer sees all the problems at once.

**If any fail, stop before changing any status.** Show the failing output (the relevant lines, not all of it). Fixing is `/implement`'s job, so suggest that. Fix something here only if the developer asks and it's small.

## 5. Set statuses and archive

1. **The ticket:** set `status: done`. Change nothing else in it.
2. **Is it the feature's last ticket?** Other tickets may have been merged to `main` since this branch was made, so this branch's copies of them can be out of date. Read their statuses from `main` instead: run `git fetch origin main` if the developer allows it, then `git show origin/main:<path>` (or `main:<path>` without a fetch). It's the last ticket when every other ticket in the feature is `done` or `cancelled`.
3. **If it's the last ticket:**
   - set the spec (if there is one) to `status: done`;
   - move the folder: `git mv specs/active/<feature> specs/archive/<feature>`;
   - search for links to `specs/active/<feature>` across the repo. This is a precise search, so you don't need to ask first. List any you find and offer to fix them.

   A feature without a spec is archived the same way when all its tickets are done.

## 6. Fill in exemplars

For each step with an **Establishes** line, the pattern it names now has its first real example. Open that pattern doc:

- **Its Exemplar section is already filled in** (an earlier run, or another ticket got there first): skip it.
- **It says "None yet":** propose the exemplar from the step's **Files**: the path plus the main symbol that shows the pattern, with a line on what to look at. Picking the symbol needs a quick look at the named file. That's a small exception to not reading the code, so read only files the step names. Show the proposal, let the developer confirm or correct it, then write it into the Exemplar section, replacing "None yet".

The `pattern` skill describes the Exemplar section; call the Skill tool with `pattern` if you need the details.

## 7. Flag follow-ups

Read the plan's **Planning decisions** and **Notes**, not the code:

- **Decisions that look ADR-worthy:** a decision is ADR-worthy when it's hard to reverse, surprising without context, or a real trade-off. List these and suggest `/to-adr`. Don't write ADRs here.
- **`Possible pattern:` notes** from implementation: list them and suggest `/to-pattern make <file> a pattern` for each the developer wants written up. Don't write them here.

## 8. Write the PR body

Read the ticket, the plan, `git log main..HEAD --oneline` and `git diff main...HEAD --stat`. Not the full diff.

Write the body to `scratchpad/pr-bodies/<feature>-NN.md`, and show it to the developer with the title:

- **Title:** a conventional-commit line, following `docs/develop/pull-requests.md`, e.g. `feat: score a draw as half a point (tournament-seeding 02)`. It isn't part of the file; it's passed to `gh pr create` separately.
- **Body:**

```md
## Summary

{The ticket's intent in two or three sentences: what now works that didn't.}

Ticket: [{feature} 02: {ticket title}]({path to the ticket}) · Plan: [plan]({path to the plan})

## Changes

- {Each plan step's title, in order}

## Acceptance criteria

- {criterion}: proven by `{test name}` in `{file}`

## Deviations from the plan

{From Notes: anything that changed from the plan, and why. "None" if none.}

## Checks

- `{command}`: passed

## Follow-ups

{ADR and pattern suggestions from step 7, or "None".}

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

- **Links use the final paths,** under `specs/archive/` if step 5 archived the feature. Make them repo-relative so they work from the PR page.

## 9. Hand over to the developer

Stop here and report:

- the check results;
- the status changes, and the archive move if there was one;
- the exemplars filled in, if any;
- the follow-ups from step 7;
- the PR title and body file;
- a suggested commit message for the status and archive changes, e.g. `chore: finish ticket tournament-seeding 02`.

Don't commit or push. The developer commits (signing goes through 1Password) and pushes from their own terminal, then tells you when it's done.

## 10. Open the PR

Once the developer says they've pushed:

1. **Check the push:** `git status -sb` shows the branch tracking its remote, and not ahead of it.
2. **Check for an existing PR:** `gh pr view --json url`. If one exists, offer `gh pr edit --body-file <file>` instead of creating another.
3. **Ask:** ready for review or a draft? Default to ready.
4. **Run** `gh pr create --base main --title "<title>" --body-file scratchpad/pr-bodies/<feature>-NN.md`, adding `--draft` if asked. Show the PR's URL.

If the sandbox blocks the call to GitHub, give the developer the command to run themselves with `!` in front.
