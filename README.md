# Arcturus

## Development

### Getting Started - Local Development

#### Prerequisites

- This repo makes use of [Node Version Manager (NVM)](https://github.com/nvm-sh/nvm) to manage the version of Node, follow the [installation instructions here](https://github.com/nvm-sh/nvm?tab=readme-ov-file#installing-and-updating)

#### Installation

- `nvm install` - Install the version of Node specified in [.nvmrc](./.nvmrc)
- `nvm use` - Switch to the version of Node specified in [.nvmrc](./.nvmrc)
- `corepack enable` - Enables [Corepack](https://github.com/nodejs/corepack), which is needed to use [Yarn](https://yarnpkg.com/), the package manager this project uses
- `yarn install` - Install Node dependencies

#### Running Locally

### Technologies

- [Node](https://nodejs.org/en)
- [NVM](https://github.com/nvm-sh/nvm) - Node Version Manager
- [Yarn](https://yarnpkg.com/) - Package Manager
- [NX](https://nx.dev/) - Build System
- [NestJS](https://nestjs.com/) - Node JS Framework
- [Prettier](https://prettier.io/) - Formatting tool

### Commands

Note: All `nx` commands should be run using `yarn`, e.g. `yarn nx run-many -t build`

- `yarn nx run-many -t build` - Builds all packages
- `yarn nx run-many -t lint` - Lints all packages
- `yarn nx run-many -t test` - Tests all packages
- `yarn nx format:check` - Checks formatting us Prettier
- `yarn nx format:write` - Formats all files with Prettier
