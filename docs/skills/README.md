---
type: index
---

# Claude Skills

The Claude skills you can use in this repo. Type a skill's command in Claude Code to run it.

| Skill                       | Command                 | Use it to…                                               |
| --------------------------- | ----------------------- | -------------------------------------------------------- |
| [grill-me](./grill-me.md)   | `/grill-me [subject]`   | have a plan or design stress-tested, without writing docs |
| [grill-me-with-docs](./grill-me-with-docs.md) | `/grill-me-with-docs [topic]` | stress-test a design while writing glossary terms and recording decisions |
| [to-adr](./to-adr.md)       | `/to-adr [decision or topic]` | turn settled decisions into ADRs                          |
| [to-spec](./to-spec.md)     | `/to-spec [feature or topic]` | write up a discussed feature as a spec                    |
| [to-tickets](./to-tickets.md) | `/to-tickets [feature]` | break a spec or feature into tickets                      |
| [plan-ticket](./plan-ticket.md) | `/plan-ticket [ticket or feature]` | plan a ticket with Claude, as a step-by-step plan file |
| [implement](./implement.md) | `/implement [plan] [--steps N]` | build a planned ticket one step at a time, reviewing each |
| [to-agent-task](./to-agent-task.md) | `/to-agent-task [plan] [step K \| steps K-M]` | hand plan steps to a cheaper model as a task brief |
| [wait-what](./wait-what.md) | `/wait-what [the part you lost]` | have Claude's last message re-pitched more simply         |

## The usual flow

A feature goes through two stages: first the work is defined, then each ticket is built.

### 1. Define the work

1. **`/grill-me-with-docs <feature>`**: work the design through. Glossary terms are written as they're agreed; decisions go into a discussion record.
2. **`/to-adr <feature>`**: turn the decisions worth recording into ADRs.
3. **`/to-spec <feature>`**: write up the feature as a spec, agreeing the boundary it's tested at.
4. **`/to-tickets <feature>`**: break the spec into tickets.

Then review and commit the glossary changes, ADRs, spec and tickets together.

### 2. Build each ticket

For each ticket that can start (its blockers are done):

1. **`/plan-ticket <feature> <NN>`**: plan the ticket with Claude. You get a branch, a step-by-step plan file, and the ticket marked in progress. Review and commit the plan.
2. **`/implement`**: Claude does the next step of the plan, then stops. Review the diff, commit it, and run `/implement` again until the plan is complete.

### Shortcuts

- **Just want your thinking challenged?** `/grill-me` grills you without writing anything.
- **A decision, not a feature?** Stop after `/to-adr`.
- **Small work?** Skip the spec and go straight to `/to-tickets`.
- **An implementation step that doesn't need you?** `/to-agent-task` writes a brief for a cheaper model to do it; `/implement` then checks the work and ticks it.
- **Lost the thread?** `/wait-what` at any point has Claude re-pitch its last message more simply.
