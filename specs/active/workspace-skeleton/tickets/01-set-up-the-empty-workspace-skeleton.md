---
type: ticket
status: ready
blocked-by: []
scopes: [arcturus]
---

# 01: Set up the empty workspace skeleton

## What to build

The repository becomes an empty but working workspace on the new toolchain. A fresh clone installs and passes check, test and build with `vp`, both on the maintainer's machine and in CI. The workspace has no packages yet. Nothing from the old stack (Nx, Yarn, NestJS, Jest, Kafka) is left in config, CI or editor settings, so neither people nor agents get steered towards it.

The skeleton contains:

- **The workspace:** a pnpm workspace whose package folders match the layout in the workspaces ADR, ready for the first packages to be added.
- **Pinned versions:** Node pinned by `.nvmrc` (unchanged), pnpm pinned by the `packageManager` field, and Vite+ pinned as a root dev dependency.
- **The tooling:** Vite+ configured for linting, formatting and type checks, with type-aware linting and type checking turned on, so `vp check` covers all three.
- **The shared base tsconfig:** for packages to extend, set up for running TypeScript source directly (strict, erasable syntax only, `.ts` import extensions, no emit).
- **CI:** composed as the CI ADR describes. A reusable quality-check workflow installs and runs check, test, build and actionlint. A pull-request workflow (on pull requests, and runnable by hand) and a main workflow (on pushes to `main`) both call it. These replace the old branch and main workflows.
- **A rewritten `.gitignore`:** Yarn and Nx entries go, and `scratchpad/` stays ignored.
- **Docs:** `CLAUDE.md` gains a *Commands* section listing the `vp` commands to run. Its note that tooling isn't set up, and its warning about leftover old-stack config, are removed. The README gains a short *Development* section on getting set up and running the checks.

## Acceptance criteria

- [ ] On a fresh clone, with the Node version from `.nvmrc`, `vp install` succeeds and installs the pinned pnpm and Vite+.
- [ ] `vp check`, `vp test` and `vp run -r build` each succeed at the root of the empty workspace.
- [ ] `vp check` fails on a deliberately introduced formatting error, lint error and type error (checked once, then reverted).
- [ ] Opening a pull request runs the pull-request workflow, which calls the quality-check workflow and goes green.
- [ ] The pull-request workflow can be started by hand, and the main workflow is triggered by pushes to `main` and calls the same quality-check workflow.
- [ ] No Nx, Yarn, NestJS, Jest or Kafka config or references remain in the repository's config, workflows or editor settings.
- [ ] `CLAUDE.md` lists the commands and no longer says tooling is unset or warns about leftover config. The README has a *Development* section.

## Notes

- Decisions: [Organise the repository as pnpm package-based workspaces](../../../../docs/adr/0016-organise-the-repository-as-pnpm-workspaces.md), [Build, test, lint and format with Vite+](../../../../docs/adr/0017-build-test-lint-and-format-with-vite-plus.md), [Run TypeScript source directly, with no build step](../../../../docs/adr/0018-run-typescript-source-directly.md), [Compose CI from reusable workflows](../../../../docs/adr/0019-compose-ci-from-reusable-workflows.md).
- Commands are run through `vp` directly, without root `package.json` script aliases.
- Pitfall: Vitest fails when it finds no test files, so `vp test` must be made to pass on an empty workspace (for example by allowing no tests).
- Out of scope: confirming that Node's type stripping works through workspace symlinks needs a real service and library, and belongs to the walking skeleton.
- Pushes and CI runs happen from the maintainer's own terminal. The sandbox can't push.
