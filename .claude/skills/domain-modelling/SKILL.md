---
name: domain-modelling
description: Actively build and sharpen the domain model — challenge terms against the glossaries, propose precise words for vague ones, stress-test concepts with edge-case scenarios, check claims against the code, and write settled terms to the right GLOSSARY.md. Use whenever a design discussion or conversation about terminology is under way, when editing a glossary or docs/CONTEXT-MAP.md, or when another skill (grill-me-with-docs) starts a session that captures docs. Not for routine coding, where the glossary is simply followed.
user-invocable: false
---

# Domain modelling

Build the domain model actively while designing: challenge the words being used, pin down what they mean, and write them down as soon as they settle. A shared, precise language is what lets the user, the code, the docs and every future agent mean the same thing by the same word.

This is the _active_ discipline, for when the model is being changed. Simply using the glossary's words while working is something every session does; it isn't this skill.

The examples below use an invented library-lending domain, not Arcturus's terms.

## Where the model lives

- `docs/CONTEXT-MAP.md` lists the **scopes**: Arcturus-wide (`arcturus`, the repo root), and each service, game and game's agents that has its own docs.
- `docs/GLOSSARY.md` is the **shared glossary**: the language of Arcturus as a whole.
- `<scope>/docs/GLOSSARY.md` is a **scope glossary**: terms only that scope uses (e.g. a game's own rules vocabulary). Created when its first term is written.

Read the shared glossary, and the glossary of any scope the discussion touches, before challenging anything.

**A term goes in the narrowest scope that uses it.** A word that more than one scope needs belongs in the shared glossary.

**A scope glossary may add any term the shared glossary doesn't define, but must not redefine one it does.** The shared glossary's `_Avoid_` lists govern Arcturus-wide language only. For example, if the shared glossary lists "item" under `_Avoid_` (preferring **Copy**), a catalogue scope is still free to define its own **Item**.

## During the session

**Challenge against the glossary.** When the user uses a word in a way that conflicts with a glossary, say so immediately: "The glossary defines _X_ as …, but you seem to mean … Which is it?"

**Sharpen vague language.** When a word is vague or overloaded, propose a precise term: "By 'the book' here, do you mean the title, or one physical copy of it?" Prefer an existing glossary term over inventing a new one.

**Test with concrete scenarios.** When concepts and their boundaries are being discussed, invent specific scenarios that force precision at the edges: a member with two loans of the same title, a copy returned to a different branch, a loan that is never returned. A definition that survives the awkward cases is one worth writing down.

**Check against the code and docs.** When the user says how something works, check whether the code, the ADRs and the docs agree. If they don't, surface it: "The code charges a fee on every late return, but you just said members get a grace period. Which is right?"

## Writing terms

Once the user has agreed a term (for example, by answering a grilling question), write it to the right glossary straight away, without asking again, and say so in one line: "Added **Loan** to `docs/GLOSSARY.md`." Capturing terms as they settle means nothing is lost, and the user sees the model grow.

When a term is renamed, move the old word to `_Avoid_`, then tell the user roughly where the old word is still used in code and docs. Don't rename it across the repo yourself: a sweeping rename is a separate piece of work, and the user decides when it happens.

### Glossary format

```md
---
type: glossary
---

# {Scope name}

{One or two sentences: what this scope is and why it exists.}

## Language

**Copy**:
One physical instance of a title that a member can borrow. A title can have many copies.
_Avoid_: item, book (for one physical instance)
```

- **Be opinionated.** When several words exist for one concept, pick the best and list the rest under `_Avoid_`.
- **Define what the term _is_,** in one or two sentences. When two terms are easily confused, say so in a short clause in the definition ("not to be confused with **Title**").
- **Only terms specific to this project.** General programming concepts (timeouts, retries, caching) don't belong, however much the project uses them.
- **No implementation details.** The glossary is not a spec or a scratchpad: no field names, endpoints or storage.
- **Group terms under subheadings** once natural clusters emerge; a flat list is fine until then.

## The context map

```md
---
type: context-map
---

# Context Map

{One paragraph: what scopes are.}

## Scopes

| ID          | Scope         | Path                 | Covers                       |
| ----------- | ------------- | -------------------- | ---------------------------- |
| `arcturus`  | Arcturus-wide | `/`                  | …                            |
| `lending`   | Lending       | `services/lending`   | Loans, returns and late fees |
| `catalogue` | Catalogue     | `services/catalogue` | Titles and their copies      |

## Relationships

- **Lending → catalogue:** looks up titles and copies through the catalogue API ([ADR](…)).
```

- **IDs** are stable kebab-case names. Specs and tickets refer to scopes by ID, so never change one casually.
- **Relationships** are one line per pair: who talks to whom, through which protocol, with a link to where it is described. The details belong in `docs/ARCHITECTURE.md` and the ADRs, not here. Leave the section out until there is a relationship to record.

**Adding a scope.** When a term or decision belongs to a service, game or game's agents that isn't in the map, propose the new scope (ID, name, path, what it covers) and ask the user. Once they confirm, add the row and create `<scope>/docs/`.

## Decisions along the way

Discussing the model often settles decisions, not just words. When one meets the ADR bar in the `adr` skill (hard to reverse, surprising without context, a real trade-off):

- inside a `grill-me-with-docs` session, record it in that session's discussion record, as the session's instructions describe;
- otherwise, offer to write the ADR, and write it following the `adr` skill.

When the discussion settles how a kind of code should be written each time (how test data is built, how external endpoints are mocked), call the Skill tool with `pattern` and follow it.
