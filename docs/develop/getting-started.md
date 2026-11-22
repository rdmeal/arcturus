---
type: guide
---

# Getting started

Set up a clone of Arcturus that passes its checks. Everything you install or do once belongs here; what you do day to day is in [Local development](./local-development.md).

1. Install [Git](https://git-scm.com/downloads).
2. Install the [Vite+ command-line tool, `vp`](https://viteplus.dev/guide/global-cli). It installs the right versions of Node and pnpm for this repository itself, so you don't need to install them first. When the installer asks whether `vp` should manage your Node installs and package managers, say yes.
3. Install [Docker Engine](https://docs.docker.com/engine/install/) with the [Compose plugin](https://docs.docker.com/compose/install/), or Docker Desktop. You need it to run the stack locally (see [Local development](./local-development.md)), though not yet for the checks below.
4. Open a new terminal, so that `vp` is on your path, and get the code:

   ```bash
   git clone https://github.com/rdmeal/arcturus.git
   cd arcturus
   ```

5. Install the dependencies:

   ```bash
   vp install
   ```

   This also installs a Git pre-commit hook that formats and lints the files you commit. To turn it off in your clone, run `vp hooks disable`.

6. Check that everything works:

   ```bash
   vp check
   vp test
   ```

   Both should finish without errors.

## Next

- [Commands](./commands.md): the commands you'll use day to day.
- [Local development](./local-development.md): run the stack on your own machine.
- [Pull requests](./pull-requests.md): how changes reach `main`.
- [Working with Claude Code](./claude-code.md): optional setup if you use Claude Code.
