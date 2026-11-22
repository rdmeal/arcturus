---
name: pattern
description: How coding patterns are discussed and written in this repo — whether something deserves a pattern doc, where it goes (Arcturus-wide by default), the file name, frontmatter and body, exemplars, and how a pattern links its ADR. Use this whenever a discussion is about how a kind of code should be written each time (test data, mocking external endpoints, structuring Playwright tests, logging…), when the user says "make this a pattern", and whenever another skill (grill-me-with-docs, domain-modelling, plan-ticket, to-pattern) needs a pattern discussed, written, changed or retired.
user-invocable: false
---

# Patterns

A pattern doc records how one kind of code is written in this repo, so that every instance is written the same way: where it lives, what it's called, its shape, and what to avoid. It exists because consistency is lost one instance at a time. Without it, the next developer (or agent) writing that kind of code makes their own reasonable choices, and the codebase ends up with three ways of doing one thing.

Patterns are usually **agreed before they're first implemented**. The doc's core is therefore its **rules**, written in prose, which can be followed before any code exists. The exemplar, a real file that follows the rules, illustrates them once the first implementation lands; it isn't the pattern itself.

The decision _behind_ a pattern ("we mock external endpoints with MSW, because…") belongs in an ADR if it clears the ADR bar. The pattern doc holds the _how_, and links the ADR.

The examples below use an invented library-lending domain, not Arcturus's terms.

## Discussing a pattern

When a pattern is being worked out, in a grilling session, during planning or in conversation, help settle rules that are concrete enough to follow:

- **Check against existing patterns.** Read the `summary` lines of the patterns already written (see "Finding existing patterns"). Raise overlaps straight away: "The fixtures pattern already covers test data. Is this a replacement for it, or an addition?"
- **Name prior art and alternatives.** Most coding patterns have well-known variants: object mothers, builders and factories for test data; MSW, hand-rolled fakes and recorded responses for external endpoints. Say what the options are and what each costs, so the choice is a real one.
- **Test the rules with awkward cases.** Invent specific situations that force precision: a mother for an aggregate that can't exist without its children, an endpoint that streams, a test that needs two variants of the same object at once. A rule that survives these is worth writing down.
- **Push until the rules can be followed without an exemplar.** Ask: "Could someone write the first instance from these rules alone?" If the answer needs code to explain, the rules aren't settled yet.
- **Check claims against the code.** When the user says how something is currently done, check whether the code agrees, and surface it when it doesn't.

**Inside a `grill-me-with-docs` session,** don't write pattern docs. Record each decision that belongs to a pattern in the session's discussion record, as that skill describes. `/to-pattern` writes the doc once the decisions have settled, because a pattern settles over several rounds and writing it as you go means rewriting it constantly.

## Does this deserve a pattern?

Offer to write a pattern doc only when all three are true:

1. **Repeated.** The kind of code is used, or expected to be used, in more than one place.
2. **Not obvious from the code alone.** Someone writing the next instance would make different choices without the doc.
3. **Worth keeping consistent.** Instances that differ have a real cost: tests that read differently, mocks that behave differently, helpers nobody can find.

A one-off needs no pattern. Neither does something any developer would write the same way unprompted.

When the user explicitly asks for a pattern doc, write it even if it falls below this bar, but say briefly which criterion it misses.

## Where it goes

Patterns are **not** placed like ADRs and glossary terms. Those are about the domain, so they go in the narrowest scope that owns them. Most patterns are about a technology or practice (Playwright tests, MSW mocks, object mothers, logging) that any scope could take up, and filing one under whichever scope used it first would hide it from the next scope that needs it.

- **`docs/patterns/` (Arcturus-wide) is the default**, for any pattern about a kind of code another scope could ever have, **even when only one scope uses it today.**
- **`<scope>/docs/patterns/`** is only for code that can't exist outside that scope by nature, e.g. "how the catalogue's search indexers are written", when only the catalogue service has search indexers.

The test is: **"If another scope added this kind of code tomorrow, should it follow this pattern?"** If yes, it's Arcturus-wide.

`docs/CONTEXT-MAP.md` lists the scopes and their paths. Create a `patterns/` folder when its first pattern is written.

**A scope that needs to depart from a wide pattern** (say, one service's end-to-end tests have to drive a canvas, so the wide Playwright pattern doesn't fit) gets its own pattern doc in its scope. That doc links the wide one and says what differs and why. The wide doc stays as it is, because it still holds everywhere else.

**A misplaced pattern is moved, never copied.** When a scope's pattern turns out to apply more widely, move it to `docs/patterns/` and fix every link to it. Two copies drift apart.

**Language.** An Arcturus-wide pattern uses only terms from `docs/GLOSSARY.md`, and generic or invented examples in its rules. Its exemplar may still live in any scope, because it shows the pattern, not the scope. If a rule only makes sense in one scope's vocabulary, the pattern probably belongs to that scope. A scope's pattern may also use that scope's `docs/GLOSSARY.md`.

## File name

`<slug>.md`: the pattern's name as a noun, lowercase and hyphenated, e.g. `object-mother.md`, `msw-endpoint-mock.md`. **No number**: patterns are edited rather than superseded, and the slug is how plans and discussion records refer to them.

## Finding existing patterns

Read only the frontmatter `summary` of each pattern, never the whole files, **always in `docs/patterns/`**, plus `<scope path>/docs/patterns/` for each scope in play. For example:

```bash
grep -H '^summary:' docs/patterns/*.md services/lending/docs/patterns/*.md
```

A folder may not exist yet. Open a pattern in full only when it's relevant to the discussion.

## Frontmatter

```yaml
---
type: pattern
summary: Use when a test needs a domain object it isn't specifically testing — build it with an object mother rather than by hand.
tags: [testing]
---
```

- **`type`:** always `pattern`. Tooling uses it to find patterns.
- **`summary`:** one line, **always starting "Use when …"**. Planning greps these lines to suggest which patterns apply, so the summary has to say _when_ the pattern applies, not just what it is.
- **`tags`:** optional; what the pattern is about, in kebab-case. **Reuse tags already used by patterns in the same folder** (check their frontmatter) before inventing a new one.

There is **no `status`**:

- **To change a pattern, edit it in place.** Unlike an ADR, a pattern doc is meant to stay current.
- **To retire a pattern, delete the doc.** If it has an ADR that no longer holds, deprecate or supersede that ADR at the same time (call the Skill tool with `adr`). The reasoning lives in the ADR, so a retired how-to has nothing left worth keeping, and git history still has it. Deleting also means planning never suggests a dead pattern.

## Body

```md
# {Pattern name}

{One or two sentences: what it is and the problem it solves.}

## When to use it

## When not to

## Rules

## Exemplar

## Related
```

- **Title:** the pattern's name in plain words, e.g. `# Object mothers for test data`.
- **When to use it:** the situations it covers, a little fuller than the summary.
- **When not to** (optional): where it doesn't fit, and what to do instead. This is often the section that stops a pattern being misused, so leave it out only when there's genuinely nothing to say.
- **Rules:** numbered, in prose. Where the code lives, what it's called, its shape, how variants are handled, and what to avoid. Each rule should be followable on its own.
- **Exemplar:** see below.
- **Related** (optional): the ADR behind the pattern, and any patterns this one builds on, departs from or is often used with. Relative links only.

**No code blocks, not even a sketch before the exemplar exists.** A rule may name a signature or file name inline, such as `` `aMember(overrides?)` `` or `` `member.mother.ts` ``. Pasted code goes stale as the real code moves on, and rules that can't be followed without a code block aren't concrete enough yet.

Write in the house style in `docs/develop/writing-docs.md`. Short is fine: a pattern that needs more than a page or two is probably two patterns.

## Exemplar

The exemplar is a real file that follows the rules, named by **path and symbol**, with a line on what to look at:

```md
## Exemplar

`services/lending/src/test/member.mother.ts`, `aMember`: the default member, the overrides parameter, and one named variant (`aSuspendedMember`).
```

- **Normally one.** Add a second only for a genuinely distinct variant the rules describe, e.g. a mother for an aggregate with required children.
- **Before the first implementation**, the section reads: `None yet: established by the first ticket that uses it.` Planning marks that ticket's step as establishing the pattern, and the exemplar is filled in when the ticket finishes.
- **Whoever moves or renames an exemplar fixes the link** in the same change.
- **If the exemplar is deleted,** set the section back to "None yet". The next step that uses the pattern establishes a new one.

## ADRs

If the decision behind a pattern clears the ADR bar (hard to reverse, surprising without context, a real trade-off; the `adr` skill explains it):

- **inside a `grill-me-with-docs` session,** record it as an ADR candidate in the discussion record, as that skill describes;
- **otherwise,** offer to write the ADR. Once the user confirms, call the Skill tool with `adr` and write it following that skill, then link it from the pattern's Related section.

Many patterns have no ADR: if the choice was easy to reverse or had no real alternative, the pattern doc is enough.

## Example

`docs/patterns/object-mother.md`, agreed before any code exists:

```md
---
type: pattern
summary: Use when a test needs a domain object it isn't specifically testing — build it with an object mother rather than by hand.
tags: [testing]
---

# Object mothers for test data

An object mother is a module of functions that each return a valid, ready-to-use domain object for tests. It keeps test setup short, and means a change to a domain type is fixed in one place instead of in every test.

## When to use it

Whenever a test needs a domain object, such as a member, a copy or a loan, that the test isn't about: the test cares that a loan exists, not how it was built.

## When not to

- When the object's construction _is_ what's being tested. Build it explicitly in the test, so the test shows what it checks.
- For request and response payloads at a service boundary. Those follow the contract, not the domain type; build them from the contract's own examples.

## Rules

1. One mother module per domain type, next to the type's module, named `<type>.mother.ts`, e.g. `member.mother.ts`.
2. The main function is named `a<Type>` or `an<Type>` (`aMember`, `aLoan`) and returns a valid object with sensible defaults.
3. Every function takes an optional `overrides` object as its only parameter, for the fields the test cares about.
4. A recurring variant gets its own named function (`aSuspendedMember`, `anOverdueLoan`) rather than the same overrides repeated across tests.
5. A mother for a type that refers to others uses their mothers for the defaults (`aLoan` calls `aMember` and `aCopy`), so one change to a type is fixed in one place.
6. Every call returns a new object. Never share an instance between tests.
7. Mothers only build objects in memory. They never save to a database or call a service; tests that need stored data store the mother's result themselves.

## Exemplar

None yet: established by the first ticket that uses it.

## Related

- [Build test data in memory, not from fixtures](../adr/0007-build-test-data-in-memory.md)
```

Once the first implementation lands, the Exemplar section names it by path and symbol, as shown under "Exemplar" above.

## Before finishing

- It clears the bar, or the user asked for it (say which criterion it misses).
- Placed by the test "could another scope have this kind of code?": `docs/patterns/` unless it can't exist outside one scope.
- A noun slug, no number; no existing pattern already covers it.
- Frontmatter complete: `type: pattern`, a `summary` starting "Use when …", existing tags reused.
- Rules numbered, in prose, and followable without code; no code blocks.
- Exemplar named by path and symbol, or "None yet: established by the first ticket that uses it."
- The ADR linked under Related if there is one; other links relative.
- Arcturus-wide patterns use only shared glossary terms.
