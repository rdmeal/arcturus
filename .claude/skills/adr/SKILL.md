---
name: adr
description: How architecture decision records (ADRs) are written in this repo — whether a decision deserves one, which scope's docs/adr folder it goes in, file naming and numbering, frontmatter, the Nygard sections, and how to supersede or deprecate an existing ADR. Use this whenever writing, editing, superseding or deprecating an ADR, or judging whether a decision made in discussion deserves one — including when another skill (domain-modelling, to-adr, grill-me-with-docs) needs an ADR written.
user-invocable: false
---

# ADRs

An ADR is a short record of one architecturally significant decision: the forces that led to it, what was decided, and what follows from it. They exist because the reasoning behind a decision is the first thing to be lost. Without it, a future developer (or agent) is left with two bad options: blindly accept a decision they don't understand, and become afraid to change anything; or blindly reverse it, and break something that depended on a reason nobody wrote down.

Write each ADR as a conversation with that future developer: full sentences, specific to this project, explaining *why*.

## Does this decision deserve an ADR?

Offer to write an ADR only when all three are true:

1. **Hard to reverse.** Changing your mind later has a real cost.
2. **Surprising without context.** A future reader would look at the code and wonder why it was done this way.
3. **A real trade-off.** There were genuine alternatives, and one was chosen for specific reasons.

If a decision is easy to reverse, it can just be reversed. If it's unsurprising or had no real alternative, there's nothing to explain. Typical ADRs: the architectural shape, how services integrate, technology choices with lock-in, who owns which data, protocol and contract design.

When the user explicitly asks for an ADR, write it even if it falls below this bar, but say briefly which criterion it misses.

**One decision per ADR.** If a discussion settled several distinct decisions, write one ADR for each. A decision that is only partly settled gets an ADR for the settled part only.

## Where it goes

Decisions are recorded in the **narrowest scope that owns them**:

- `docs/adr/` holds Arcturus-wide decisions: those affecting the platform as a whole, the protocols between services, or the repo's tooling.
- `<scope>/docs/adr/` holds decisions belonging to one service, game, or a game's agents.

`docs/CONTEXT-MAP.md` lists the scopes and where each lives. Read it to find the right folder.

To choose, ask which scope would have to change if the decision were reversed. "Games own their match state" constrains every game and the tournament runner, so it is Arcturus-wide. "Rock-paper-scissors stores each round as a row" only affects that game, so it goes in that game's scope.

## File name and number

`NNNN-imperative-verb-phrase.md`, e.g. `0003-use-pnpm.md`. Lowercase, hyphenated, and phrased as the decision ("use", "store", "deliver", "split").

Numbers run **per ADR folder**, starting at `0001`. To get the next number, find the highest existing number in that folder and add one. If you are on a branch, also check the same folder on `main` (`git ls-tree --name-only main <folder>/`), since another branch may have already merged an ADR. Never reuse a number, even one whose ADR was deleted.

Because the same number appears in many folders, **always refer to another ADR by a relative link**, never by a bare number ("see [Use pnpm](../../docs/adr/0003-use-pnpm.md)", not "see ADR 3").

## Frontmatter

```yaml
---
type: adr
status: accepted
date: 2026-11-15
summary: Use pnpm so that packages can only import the dependencies they declare.
tags: [tooling, monorepo]
---
```

- **`type`:** always `adr`. Tooling uses it to find ADRs.
- **`status`:** `accepted`, `superseded` or `deprecated`.
  - **A new ADR is always written as `accepted`.** There is no "proposed" status: the ADR is committed on a branch along with the work that depends on it, and merging that branch's PR is what accepts both. If the PR is rejected, the ADR goes with it.
  - `superseded`: replaced by a newer ADR, named in `superseded-by`.
  - `deprecated`: no longer applies, and nothing replaces it.
- **`date`:** the date the ADR was written. Update it when the status changes.
- **`summary`:** one line saying what was decided and the main reason. It is written for an index, so someone scanning a list of summaries can tell whether this ADR is the one they need.
- **`tags`:** optional; what the ADR is about, in kebab-case. **Reuse tags already used by ADRs in the same folder** (check their frontmatter) before inventing a new one. A near-duplicate (`db` beside `database`) splits ADRs that belong together.
- **`supersedes`:** optional; a list of relative links to the ADRs this one replaces.
- **`superseded-by`:** a relative link to the replacing ADR; required when `status` is `superseded`.

Don't add anything already given by the file name or path (number, scope), and don't put the title in the frontmatter: the title is the H1.

## Body

```md
# {The decision, in plain words}

## Context

## Decision

## Consequences

## Alternatives considered
```

The status lives only in the frontmatter, so there is no Status section.

- **Title:** the decision in plain words, without a number, e.g. `# Use pnpm as the package manager`.
- **Context:** the forces at play: technical, project and personal constraints, often pulling against each other. State facts neutrally; the decision comes next. Include what makes the decision necessary now. Date anything that may go stale (versions, prices, the maturity of a tool), e.g. "Vite+ reached 1.0 in September 2026".
- **Decision:** what was decided, in active voice, starting "We will…". State it plainly, without hedging.
- **Consequences:** everything that follows, not just the benefits: what becomes easier, what becomes harder, risks accepted, and any follow-on decisions this creates. These consequences become context for later ADRs.
- **Alternatives considered** (optional): include only when the rejected options are worth remembering, e.g. because someone is likely to suggest them again. For each, say briefly why it lost. Otherwise leave the section out.

Short is fine. A few sentences per section is often enough; more than one or two pages means the ADR is probably covering more than one decision. Use bullets where they help, but not as a reason to write fragments.

Write in plain British English. Use the terms defined in `docs/GLOSSARY.md` and in the scope's own `docs/GLOSSARY.md` if it has one. Link to related ADRs by relative path.

## Changing an existing ADR

**Before it reaches `main`**, an ADR is still being written along with its branch, so edit it freely. Check with `git log main -- <path>`: no output means it hasn't been merged.

**Once it is on `main`, it is fixed.** Only these changes are allowed:

- the frontmatter `status`, `date` and `superseded-by`;
- fixing broken links and typos.

Anything else (a changed decision, new reasoning, a reversed consequence) is a new ADR. The history of what was decided, and when, is part of the record.

### Superseding

When a new decision replaces an old one:

1. Write the new ADR in the **same folder** as the one it replaces, with `supersedes: [<link to old ADR>]`. Its Context explains what changed since the old decision.
2. In the old ADR, set `status: superseded`, `superseded-by: <link to new ADR>`, and update `date`.

Both links are needed. The new ADR shows what it replaced, and an agent that opens the old ADR directly sees straight away that it no longer applies.

An ADR can't supersede one from a different scope. If one game needs an exception to an Arcturus-wide decision, write a new ADR in the game's scope that links to the wide one and explains the exception ("Rock-paper-scissors departs from [Games own their match state](…) because…"). The Arcturus-wide ADR stays accepted, because it still holds everywhere else.

### Deprecating

When a decision simply stops applying and nothing replaces it (e.g. the component it governed was removed), set `status: deprecated` and update `date`. Don't delete the file: knowing what used to be decided still helps future readers.

## Example

`docs/adr/0003-use-pnpm.md`:

```md
---
type: adr
status: accepted
date: 2026-11-15
summary: Use pnpm so that packages can only import the dependencies they declare.
tags: [tooling, monorepo]
---

# Use pnpm as the package manager

## Context

The repo is a set of packages, each with its own `package.json`, so that in-repo games and players consume the platform in the same way as plugins from other repositories: through declared dependencies. That only works if a package cannot quietly import something it hasn't declared. Without lint-based module-boundary rules, the package manager is the only thing that can enforce this.

The repo previously used Yarn 4. Its `node-modules` linker does not stop a package from resolving undeclared dependencies, and its Plug'n'Play mode is strict but adds friction with other tools.

## Decision

We will use pnpm as the package manager for the whole repo.

## Consequences

- A package can only resolve the dependencies it declares, so the package boundaries are enforced rather than conventional.
- Undeclared imports fail at install or build time, which may surface missing dependencies that Yarn hid.
- Contributors need pnpm installed (via Corepack).

## Alternatives considered

- **Yarn 4 with the `node-modules` linker:** does not enforce declared dependencies.
- **Yarn 4 with Plug'n'Play:** strict, but adds friction with tools that expect a `node_modules` folder.
```

## Before finishing

- One decision, in the narrowest scope that owns it.
- The next free number in that folder (also checked against `main`), and an imperative file name.
- Frontmatter complete, with existing tags reused.
- Context, Decision and Consequences all present; Alternatives considered only if worth it.
- Other ADRs referred to by relative link.
- When superseding, both ADRs updated.
