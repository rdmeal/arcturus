---
type: plan
---

# Plan 01: Set up the empty workspace skeleton

Implements [ticket 01](../tickets/01-set-up-the-empty-workspace-skeleton.md).

## Context

- **Test boundary:** the feature has no spec, so the boundary was agreed during planning. It is the repository root as a fresh clone sees it: the `vp` commands (`vp install`, `vp check`, `vp test`, `vp run -r build`), the root `package.json` scripts, and the GitHub Actions runs. The workspace has no packages, so most criteria are proven by running a command or by inspection, not by test files.
- **ADRs:**
  - [0016: Organise the repository as pnpm package-based workspaces](../../../../docs/adr/0016-organise-the-repository-as-pnpm-workspaces.md): the workspace globs are `apps/web`, `services/*`, `packages/*`, `games/*/service`, `games/*/agents` and `tools/*`.
  - [0017: Build, test, lint and format with Vite+](../../../../docs/adr/0017-build-test-lint-and-format-with-vite-plus.md): `vp` is the only toolchain, its version is pinned, and `vp check` runs with type-aware linting and type checking turned on.
  - [0018: Run TypeScript source directly](../../../../docs/adr/0018-run-typescript-source-directly.md): every package is ESM only. The shared base tsconfig is strict, allows erasable syntax only, uses `.ts` import extensions and emits nothing. There are no project references.
  - [0019: Compose CI from reusable workflows](../../../../docs/adr/0019-compose-ci-from-reusable-workflows.md): a reusable `quality-check` workflow, called by a `pull-request` workflow (on `pull_request` and `workflow_dispatch`) and by a `main` workflow (on pushes to `main`).
- **Patterns:** none. There's no `docs/patterns/` folder yet, and this ticket needs none.
- **Planning decisions:**
  - **Root scripts:** the root `package.json` gets `check`, `test` and `build` scripts that call `vp`, following the [Vite+ local CLI best practices](https://viteplus.dev/guide/local-cli#best-practices). They let collaborators run the checks through pnpm without the global CLI. ADR 0017 was edited during planning to drop its "no root script aliases" sentence. This overrides the ticket's note that commands run "without root `package.json` script aliases", and `CLAUDE.md`'s matching line, which step 6 changes.
  - **Installing `vp`:** locally, the Vite+ global CLI together with the project's `vite-plus` dev dependency, as Vite+ recommends. The global CLI needs no Node installed first: it reads `.nvmrc` for Node and `packageManager` for pnpm, and hands commands to the project's `vite-plus`. In CI, `voidzero-dev/setup-vp`, with Node from `.nvmrc`. It runs `vp install` and handles caching.
  - **pnpm settings:** follow [pnpm supply-chain security](https://pnpm.io/supply-chain-security). Pin pnpm 11, because these defaults come from it. `allowBuilds` starts empty and `strictDepBuilds` stays on: if a dependency needs a build script, add it to `allowBuilds` by name, after review. Keep `blockExoticSubdeps` on. Set `minimumReleaseAge: 10080` (one week) and `trustPolicy: no-downgrade`. Commit `pnpm-lock.yaml`. Skip `namedRegistries`, because only the npm registry is used.
  - **pnpm and TypeScript:** follow [pnpm TypeScript](https://pnpm.io/typescript). Set `addMissingPeerTypes: true`, and never set `preserveSymlinks` in a tsconfig.
  - **The base tsconfig:** `tsconfig.base.json` at the root, which packages extend by relative path. A root `tsconfig.json` extends it and includes only the root `*.ts` files, today just `vite.config.ts`. Putting it in a `packages/tsconfig` package was rejected: it adds a dependency to every package for no gain.
  - **Workspace folders:** only the globs in `pnpm-workspace.yaml`, with no `.gitkeep` placeholders. The first package creates its own folder.
  - **Empty test run:** `test: { passWithNoTests: true }` in `vite.config.ts`, with a comment saying it can go once tests exist.
  - **Formatting:** Oxfmt defaults plus `sortPackageJson: true`. `.editorconfig` stays as it is.
  - **actionlint:** the `rhysd/actionlint` Docker image, pinned by digest, with the version in a comment. It executes no remote script, the digest is immutable, and it bundles shellcheck.
  - **Third-party actions:** pinned to a full commit SHA, with the version in a comment, in keeping with the supply-chain settings above.
  - **Editor settings:** `.vscode/settings.json` makes the Oxc extension the default formatter, and `.vscode/extensions.json` recommends it.
  - **README:** a *Development* section with a *Getting started* subsection, rather than the ticket's plain *Development* section. It is a zero-to-hero guide that assumes no prior knowledge: it links each install step to that tool's official installation page, and explains nothing that isn't needed to get the code running.

## Steps

- [x] **1. Remove the old stack**
  - **Goal:** no Nx, Yarn, NestJS, Jest, Kafka or Prettier config is left in config, workflows or editor settings. There's no build or check yet, so nothing can go red.
  - **Files:**
    - `.github/workflows/build-branch.yml` and `build-main.yml`: delete.
    - `.gitattributes`: remove the `.yarn` and `.pnp` entries, and delete the file if nothing is left.
    - `.vscode/settings.json`: remove `nxConsole.generateAiAgentRules`. Step 4 refills the file.
    - `.gitignore`: rewrite it. Keep `node_modules/`, `scratchpad/`, `coverage/`, `dist/`, `*.tsbuildinfo`, `*.log` and the `.env*` files, plus the `.vscode/*` allow-list so `settings.json` and `extensions.json` stay tracked. Drop the Yarn, Nx and Cursor or Nx-rules entries, and the boilerplate for tools the repo doesn't use (Gatsby, Nuxt, Bower and so on).
  - **Read first:** none
  - **Tests:** none, since this is config removal.
  - **Check:** `git grep -n -i -E '\bnx\b|yarn|nestjs|jest|kafka|prettier' -- ':!docs' ':!specs' ':!scratchpad' ':!.claude/skills' ':!CLAUDE.md'` returns nothing. Docs, specs and skills may mention the old stack as history; `CLAUDE.md` is cleared by step 6.

- [ ] **2. Add the pnpm workspace with pinned pnpm and Vite+**
  - **Goal:** `vp install` succeeds on a fresh clone, and installs the pinned pnpm and Vite+.
  - **Files:**
    - `package.json`:
      - `"name": "arcturus"`, `"private": true`, `"type": "module"`.
      - `"packageManager": "pnpm@11.<x>.<y>"`, the latest pnpm 11 release that is at least a week old.
      - `devDependencies` with `vite-plus` at an exact version, one at least a week old because `minimumReleaseAge` would refuse anything newer.
      - `scripts`: `"check": "vp check"`, `"test": "vp test"`, `"build": "vp run -r build"`. Vite Task prunes the root's self-reference in the recursive build.
    - `pnpm-workspace.yaml`:
      - `packages`: the ADR 0016 globs.
      - The supply-chain settings: `minimumReleaseAge: 10080` and `trustPolicy: no-downgrade`. The `allowBuilds` list is empty or absent; `strictDepBuilds` and `blockExoticSubdeps` are left at their defaults, with a comment noting they are deliberately on.
      - `addMissingPeerTypes: true`.
    - `pnpm-lock.yaml`: generated, and committed.
  - **Read first:** [pnpm supply-chain security](https://pnpm.io/supply-chain-security) and [pnpm settings](https://pnpm.io/settings), for the exact key names and value formats. [Vite+ local CLI](https://viteplus.dev/guide/local-cli) and [Vite+ global CLI](https://viteplus.dev/guide/global-cli). Look these up with context7 (`/websites/viteplus_dev_guide`) where possible.
  - **Tests:** none.
  - **Check:** `vp install`, then `vp env current` shows Node from `.nvmrc` and pnpm from `packageManager`. The sandbox may block the global installer or registry access. If it does, ask the developer to run `! vp install`.

- [ ] **3. Configure Vite+ and add the shared base tsconfig**
  - **Goal:** `vp check`, `vp test` and `vp run -r build` pass on the empty workspace, as do their pnpm script forms. `vp check` catches format, lint and type errors.
  - **Files:**
    - `tsconfig.base.json`:
      - `strict`, `erasableSyntaxOnly`, `allowImportingTsExtensions`, `noEmit`, `verbatimModuleSyntax`.
      - `module` and `moduleResolution` set to `nodenext`, with a `target` that matches Node 26.
      - `skipLibCheck`, and `isolatedModules` if Node's type stripping needs it.
      - No `preserveSymlinks`, no project references, and no DOM or JSX settings: the web app adds those itself.
    - `tsconfig.json`: extends `./tsconfig.base.json` and includes the root `*.ts` files.
    - `vite.config.ts`: `defineConfig` from `vite-plus`.
      - `lint.options` sets `typeAware: true` and `typeCheck: true`.
      - `fmt` sets `sortPackageJson: true`.
      - `test` sets `passWithNoTests: true`, with a comment saying it can go once tests exist.
      - Ignore patterns cover `scratchpad/**` and anything else that shouldn't be checked.
  - **Read first:** [Vite+ lint config](https://viteplus.dev/config/lint), [check config](https://viteplus.dev/config/check), [fmt config](https://viteplus.dev/config/fmt), and the Vite+ test config (context7 `/websites/viteplus_dev_config`). [Node TypeScript type stripping](https://nodejs.org/api/typescript.html), for the tsconfig settings it recommends.
  - **Tests:** none committed. This is a one-off manual check, then reverted:
    - a mis-formatted line in `vite.config.ts` makes `vp check` fail;
    - a lint error, such as an unused variable or `debugger`, makes `vp check` fail;
    - a temporary root `scratch-type-error.ts` containing `const n: number = "x";` makes `vp check` fail.
  - **Check:** `vp check && vp test && vp run -r build`, then `pnpm run check && pnpm run test && pnpm run build`, then the three deliberate failures above. Revert each and confirm `git status` is clean apart from this step's files.

- [ ] **4. Set up editor settings for Vite+**
  - **Goal:** VS Code formats and lints with the same Oxc tools as `vp check`, and nothing points at Nx.
  - **Files:** `.vscode/settings.json` makes the Oxc extension the default formatter, with format on save. `.vscode/extensions.json` recommends the Oxc extension.
  - **Read first:** the Vite+ editor setup guide (context7 `/websites/viteplus_dev_guide`, "editor" or "VS Code"), for the extension ID and the settings it recommends.
  - **Tests:** none.
  - **Check:** `vp check` still passes. It formats the JSON files too.

- [ ] **5. Add the CI workflows**
  - **Goal:** pull requests and pushes to `main` run the same checks through one reusable workflow.
  - **Files:**
    - `.github/workflows/quality-check.yml`: `on: workflow_call`, with `permissions: contents: read`. One job runs `actions/checkout`, then `voidzero-dev/setup-vp` with `node-version-file: .nvmrc` and `cache: true`, then `vp check`, `vp test` and `vp run -r build`. A final actionlint step runs `docker run --rm -v "$PWD:/repo" -w /repo rhysd/actionlint@sha256:<digest> -color`. Pin every action by commit SHA, with the version in a comment.
    - `.github/workflows/pull-request.yml`: `on: pull_request` and `workflow_dispatch`, with one job that runs `uses: ./.github/workflows/quality-check.yml`.
    - `.github/workflows/main.yml`: `on: push: branches: [main]`, with one job that runs `uses: ./.github/workflows/quality-check.yml`.
  - **Read first:** [Vite+ CI guide](https://viteplus.dev/guide/ci) and the [setup-vp inputs](https://github.com/voidzero-dev/setup-vp#inputs), for the latest release and its SHA. The [actionlint Docker usage](https://github.com/rhysd/actionlint/blob/main/docs/usage.md), for the latest image digest. [Reusable workflows](https://docs.github.com/en/actions/sharing-automations/reusing-workflows).
  - **Tests:** none. actionlint is the check.
  - **Check:** run the same `docker run … rhysd/actionlint@sha256:<digest>` locally if Docker works in the sandbox. If it doesn't, the developer runs it, or it's proven by the PR run in step 7. `vp check` still passes.

- [ ] **6. Document the commands and getting started**
  - **Goal:** people and agents know how to get set up and which commands to run, and nothing says the tooling is unset.
  - **Files:**
    - `CLAUDE.md`:
      - Remove the paragraph "The tooling and CI are decided but not set up yet…", including its leftover-config warning.
      - Change the *Tooling* bullet so it no longer says "with no root script aliases".
      - Add a *Commands* section listing `vp install`, `vp check`, `vp test`, `vp run -r build`, `vp fmt` for fixing formatting, and a single test file run. Note that the pnpm scripts (`pnpm run check`, `pnpm run test`, `pnpm run build`) are equivalents.
    - `README.md`: a *Development* section with a *Getting started* subsection, written as a zero-to-hero guide that assumes no prior knowledge.
      - Install Git, linking to the official Git downloads page.
      - Install the Vite+ global CLI, linking to <https://viteplus.dev/guide/global-cli>. It brings the right Node and pnpm itself.
      - Clone the repository, run `vp install`, then `vp check` and `vp test`.
      - Explain nothing beyond what is needed to get it running. Other sections do the explaining.
      - Place it so it fits the README's existing sections, near *Setting up Claude Code*.
  - **Read first:** `README.md` and `CLAUDE.md` in full.
  - **Tests:** none.
  - **Check:** `vp check` passes; it formats Markdown too, if it is configured to. Read the README guide through as a newcomer: every step is a link or a command, and nothing is assumed.

**7. Acceptance criteria**, checked at the test boundary:

- [ ] On a fresh clone, with the Node version from `.nvmrc`, `vp install` succeeds and installs the pinned pnpm and Vite+: proven by a fresh `git clone` into `$TMPDIR` and `vp install` there, with `vp env current` showing the pinned versions. The developer may need to run this outside the sandbox.
- [ ] `vp check`, `vp test` and `vp run -r build` each succeed at the root of the empty workspace: proven by running them in the fresh clone, along with `pnpm run check`, `pnpm run test` and `pnpm run build`.
- [ ] `vp check` fails on a deliberately introduced formatting error, lint error and type error (checked once, then reverted): proven by the manual check in step 3.
- [ ] Opening a pull request runs the pull-request workflow, which calls the quality-check workflow and goes green: proven by the developer pushing the branch and opening a draft PR from their own terminal.
- [ ] The pull-request workflow can be started by hand, and the main workflow is triggered by pushes to `main` and calls the same quality-check workflow: proven by a manual `workflow_dispatch` run on the branch, and by inspecting `main.yml`, whose `on.push.branches` is `[main]` and whose job calls `./.github/workflows/quality-check.yml`.
- [ ] No Nx, Yarn, NestJS, Jest or Kafka config or references remain in the repository's config, workflows or editor settings: proven by the `git grep` in step 1's Check, run after step 6 without the `':!CLAUDE.md'` exclusion.
- [ ] `CLAUDE.md` lists the commands and no longer says tooling is unset or warns about leftover config. The README has a *Development* section: proven by inspecting both files after step 6.

## Notes

- 2026-11-19: Step 1's `git grep` excludes `.claude/skills` (their Yarn mentions are worked examples, not config) and, until step 6 rewrites it, `CLAUDE.md`. The step 7 criterion runs it without the `CLAUDE.md` exclusion.
