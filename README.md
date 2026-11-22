# Arcturus

A tournament arena for turn-based games, where agents and humans compete over HTTP.

Arcturus is a self-hostable platform for running tournaments of turn-based games between players: automated agents (anything from fixed rules to LLMs), or humans playing through a UI. It ships with a set of core games and agents, and its open HTTP protocols let anyone add new games and players from their own repositories, in any language.

> **Status:** Arcturus is being rebuilt from scratch. Nothing runs yet.

## What Arcturus is made of

| Part              | What it is                                                                                                         |
| ----------------- | ------------------------------------------------------------------------------------------------------------------ |
| **The platform**  | The game-independent services that run tournaments: the tournament runner, the player gateway and the web frontend |
| **Core games**    | Games maintained in this repository, each running as its own game service                                          |
| **Core agents**   | Automated players maintained in this repository, at least one per core game                                        |
| **The protocols** | The game protocol and player protocol: implement one to add a game or a player, in any language                    |

This repository is written in TypeScript; games and players can be written in any language, in their own repositories.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for how the parts fit together and [docs/GLOSSARY.md](docs/GLOSSARY.md) for the terms used throughout.

## Development

### Getting started

1. Install [Git](https://git-scm.com/downloads).
2. Install the [Vite+ command-line tool, `vp`](https://viteplus.dev/guide/global-cli). It installs the right versions of Node and pnpm for this repository itself, so you don't need to install them first. When the installer asks whether `vp` should manage your Node installs and package managers, say yes.
3. Open a new terminal, so that `vp` is on your path, and get the code:

   ```bash
   git clone https://github.com/rdmeal/arcturus.git
   cd arcturus
   ```

4. Install the dependencies:

   ```bash
   vp install
   ```

   This also installs a Git pre-commit hook that formats and lints the files you commit. To turn it off in your clone, run `vp hooks disable`.

5. Check that everything works:

   ```bash
   vp check
   vp test
   ```

   Both should finish without errors.

### Pull requests

Pull requests are squash-merged, so a pull request's title becomes its commit on `main`. Write it as a [Conventional Commit](https://www.conventionalcommits.org/en/v1.0.0/), such as `feat(gateway): retry failed deliveries`; CI checks it. Commits on your branch can be written however you like.

## Setting up Claude Code

This repository is set up for working with [Claude Code](https://code.claude.com). A project hook formats every file Claude writes or edits; it needs [`jq`](https://jqlang.org/download/) on your path. These are the external tools it uses that you need to set up yourself. See [docs/skills/README.md](docs/skills/README.md) for the workflow commands you can run.

### Context7

[Context7](https://context7.com/docs) gives Claude current documentation for the libraries this repo uses, rather than relying on its training data. It's recommended, not required: without it, Claude falls back on what it already knows and web search, which is less reliable for recent releases.

To set it up:

1. Create a Context7 account. The [free plan](https://context7.com/plans-pricing) is enough.
2. Run `/mcp` in Claude Code, approve the project's `context7` server and sign in.

Claude's lookup queries are sent to Context7's service.

Claude looks up docs automatically when a question or task involves a library's API. To force a lookup, say "use context7 to look up …" and name the library, and the version if it matters.

Finding a library (`resolve-library-id`) runs without asking, but **each docs fetch (`query-docs`) asks for your approval**. Check that the library ID is the one you mean, the right project and version. If it isn't, deny the fetch and tell Claude which library to use: docs for the wrong library mislead Claude for the rest of the session.
