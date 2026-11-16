---
name: pick-up
description: Pick up work from a handoff written by /handoff — the latest one in scratchpad/handoffs/, a given handoff path, or one found from a description of what it was about. Checks the working tree against it, says where things stand, and starts its Next step on the developer's go.
disable-model-invocation: true
argument-hint: "[handoff path | what it was about]"
---

# Pick Up

Carry on from a **handoff file** that `/handoff` wrote in an earlier session. The handoff carries what that conversation knew and didn't put on disk; this session has nothing else. So read the handoff, check it still matches the repo, tell the developer where things stand, and start the next step once they say go.

Keep it cheap. Handoffs live in one folder with descriptive names and titles, so finding one is a listing or a `grep`, never a broad search or a subagent.

What the developer asked for: $ARGUMENTS

## 1. Find the handoff

Handoffs are `scratchpad/handoffs/YYYY-MM-DD-HHMM-<slug>.md`. The first line of each is `# Handoff: {topic}`.

- **Nothing given:** take the latest. The timestamp prefix sorts them, so it's the last name in `ls scratchpad/handoffs/`. A superseded handoff always sorts before the one that replaced it, so there's nothing else to check.
- **A path** (an existing file, or anything ending in `.md`): use that file. If it doesn't exist, say so and list the five most recent handoffs.
- **Anything else is a description.** Match it against slugs and titles: `grep -m1 '^# Handoff' scratchpad/handoffs/*.md`. If one clearly fits, use it. If a few might, read just their "Goal and where it stands" sections to decide. If it's still unclear, show up to three candidates (date, title, a line from the goal) and ask. Prefer the newer one when two are about the same thing.

If the folder is empty or missing, say there are no handoffs to pick up and stop.

**Say which handoff you took** at the top of your reply (path, date, title), so the developer can stop you if it's the wrong one. Don't ask for confirmation first.

## 2. Check the working tree

The handoff's "Working tree" section records the branch, commit and uncommitted files when it was written. Compare:

- `git branch --show-current`: if it differs from the handoff's branch, say so and ask what to do. Never switch branches, stash, reset or discard anything yourself.
- `git rev-parse --short HEAD`: if HEAD has moved past the recorded commit, run `git log --oneline <recorded hash>..HEAD` to see what's happened since. If the recorded commit isn't an ancestor of HEAD, say so.
- `git status --short`: compare it with the uncommitted files the handoff lists. Note files that have since been committed, new changes, and files that were "throwaway".

Drift isn't an error. Work often carries on after a handoff. Just report it, and take it into account. For example, if commits since the handoff look like they did its Next step, say so rather than doing it again.

## 3. Report and wait

Read the handoff in full, but **not** its "Read first" documents yet. The developer may change direction, and those reads are wasted if they do.

Reply briefly:

- **The handoff:** path, date, title.
- **Where things stand:** a few lines from its Goal section.
- **Drift:** what's changed since it was written, or "none".
- **Still not written down:** its unrecorded decisions, with where each belongs, as a reminder. They're still only in that file.
- **Unanswered questions:** any open question marked "(asked, unanswered)". Ask it again here, since the developer's answer may change the next step.
- **Next step:** what it says, adjusted for any drift. End with a question, e.g. "Run `/implement`?" or "Start on that?"

Then stop and wait.

## 4. On the developer's go

- Read the "Read first" documents the next step needs, in the handoff's order. The handoff picked them, so don't add more without a reason.
- Treat the handoff's decisions and "Tried and dropped" as settled. Don't re-open them unless something on disk contradicts them; if it does, say so.
- If the Next step is a skill command (`/implement`, `/finish-ticket`, `/to-adr`, …), call that skill with the Skill tool, with the arguments the handoff gives. Don't ask the developer to type it.
- Otherwise, do the next step as the handoff describes it.

**Never edit the handoff file.** It's a fixed record of that session. If this conversation later ends with `/handoff`, the new file links this one as "Supersedes".
