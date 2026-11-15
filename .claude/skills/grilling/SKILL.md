---
name: grilling
description: Grill the user relentlessly about a plan, design, decision or idea until there is a shared understanding — rounds of numbered questions, each with a recommended answer. Use whenever the user wants their thinking stress-tested ("grill me", "poke holes in this", "challenge this plan", "interview me about…"), and whenever another skill (grill-me, grill-me-with-docs) starts a grilling session.
user-invocable: false
---

# Grilling

Interview the user relentlessly until you both understand the plan the same way. The point is to surface every decision before anyone acts on it, so that nothing is silently assumed.

## The design tree

Treat the subject as a **design tree**: every decision branches into the decisions that hang off it. The **frontier** is every decision whose prerequisites are already settled: the questions you can ask *now* without guessing at answers you haven't heard yet.

Work the tree in **rounds**. Each round asks the whole frontier, then waits for the user's answers. Answers settle decisions and push the frontier outward, so recompute it from scratch before the next round. A question whose answer depends on another question still open in this round belongs to a later round.

There is no limit on questions or rounds. Some plans need three questions, some need fifty. The user controls the length: if they say to wrap up, go straight to the summary (see "Ending the session").

## Asking a round

```
❓ **Q1 – <question title>**: <question body: as many paragraphs as needed, including any options>

➡️ <your recommended answer>

---

❓ **Q2 – <question title>**: <question body>

➡️ <your recommended answer>
```

- Number questions continuously across the session, so the user can answer by number ("Q3 yes, Q4 the second option").
- Give every question a recommendation, and word the question so that **"yes" accepts the recommendation**. If your recommendation disagrees with the question as you first phrased it, rephrase the question.
- Give enough context in the body for the question to be answered on its own: what the options are, and what each one costs.
- Ask in plain chat text, so the user answers in their own words.

## Facts are yours; decisions are the user's

**Never ask the user for a fact you could look up.** When a frontier question needs a fact from the environment (the code, the docs, the ADRs, a command's output), find it yourself:

- Look it up directly when it is a quick, targeted read: open the file, run the command.
- For a broad search across many files that would flood the conversation, dispatch the `Explore` agent with `model: haiku`, and ask it for findings with the file paths they came from. When a finding will decide a question, read the cited file yourself before relying on it: the search agent is good at finding things, less so at judging them.

Don't hold up the round while you look: only the questions that depend on the lookup wait. Ask the rest of the frontier now.

**Decisions belong to the user.** Put each one to them and wait. Answering your own question, or treating a recommendation as settled because the user hasn't objected yet, defeats the point of the session.

## Push back

Being relentless means not nodding along. When an answer contradicts something (an earlier answer, the code, an ADR, the glossary), raise the conflict as a question in the next round: say what conflicts with what, and recommend how to resolve it. The user still decides. Do the same when an answer has a consequence the user may not have seen.

## Deferring and "your call"

- **Deferred:** the user can defer a question. Mark it deferred and don't ask it again. A deferred question doesn't keep the session open.
- **"Your call":** if the user answers "your call" (or similar), adopt your recommendation, but keep track that it was your recommendation accepted by the user, not their own decision.

## Ending the session

The session is done when the frontier is empty: every branch visited, each question settled or deferred. Then post a summary:

```
## Summary

**Settled**
- <decision>

**Adopted on "your call"**
- <decision>

**Deferred**
- <question>
```

Leave out empty sections. Then ask the user to confirm that you have reached a shared understanding. **Do not act on anything from the session until they confirm.** The summary is in the conversation only; writing it to files is the job of other skills.
