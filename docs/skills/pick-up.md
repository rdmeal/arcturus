---
type: skill-guide
---

# pick-up

Type it at the start of a fresh session to carry on from a handoff written by [`/handoff`](./handoff.md). You don't need to find the file.

## How to use it

| You type                                                            | Claude picks up from                                 |
| ------------------------------------------------------------------- | ---------------------------------------------------- |
| `/pick-up`                                                          | the latest handoff                                   |
| `/pick-up scratchpad/handoffs/2026-11-16-1430-seeding-tiebreaks.md` | that handoff                                         |
| `/pick-up the seeding tiebreaks`                                    | the handoff that matches, by its title and file name |

If a description matches more than one handoff, Claude shows up to three and asks. It always names the handoff it took, so you can stop it if it's the wrong one.

## What happens

1. **Claude checks the working tree** against the handoff: the branch, the commit, and the uncommitted files. If the work has moved on, it tells you what changed. If you're on a different branch, it asks; it never switches branches or stashes for you.
2. **Claude reports and waits.** You get where things stand, any drift, the decisions the handoff says are still not written down, any question you hadn't answered, and the next step, e.g. "Run `/implement`?"
3. **On your go,** Claude reads the documents the handoff lists and starts the next step. If that's a skill command like `/implement`, Claude runs it for you.

Claude doesn't read the handoff's linked documents until you say go, in case you want to do something else. It never edits the handoff. If you end this session with `/handoff` too, the new handoff links the old one.
