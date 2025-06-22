# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Arcturus is a microservices-based tournament platform built with NX monorepo architecture. It consists of:

- **Tournament Runner Service**: Core tournament orchestration service
- **Game-Specific Runner Services**: Individual game implementations (currently Rock-Paper-Scissors)
- **Database Layer**: PostgreSQL with Flyway migrations per game

## Architecture

### Monorepo Structure

- Uses NX workspace with Yarn package manager
- Each service is a separate NX project with its own `project.json`
- Services are NestJS applications compiled with Webpack
- Database migrations are isolated per game in `games/[game-name]/database/migrations/`

### Service Architecture

- Each runner service follows the same NestJS structure: `app.module.ts`, `app.controller.ts`, `app.service.ts`
- Services communicate through HTTP APIs
- Tournament runner orchestrates game-specific runners
- Database schema uses UUIDs for primary keys and enum types for game moves

## Development Commands

### Workspace-wide Commands

```bash
# Build all projects
yarn nx run-many -t build

# Lint all projects
yarn nx run-many -t lint

# Test all projects
yarn nx run-many -t test

# Format code
yarn nx format:write
yarn nx format:check

# Lint GitHub Actions
yarn nx run arcturus:lint:actions
```

### Project-specific Commands

```bash
# Build specific service
yarn nx build tournament-runner-service
yarn nx build rock-paper-scissors-runner-service

# Run specific service in development
yarn nx serve tournament-runner-service
yarn nx serve rock-paper-scissors-runner-service

# Test specific service
yarn nx test tournament-runner-service
yarn nx test rock-paper-scissors-runner-service

# Lint specific service
yarn nx lint tournament-runner-service
```

### Database Operations

Rock-Paper-Scissors database setup:

```bash
cd games/rock-paper-scissors/database
docker-compose up -d
```

## Key Configuration Files

- `nx.json`: NX workspace configuration with plugins for Webpack, ESLint, and Jest
- `tsconfig.base.json`: TypeScript base configuration for the monorepo
- Individual `project.json` files define build, serve, and test targets for each service
- Database migrations use Flyway naming convention: `V{version}__{description}.sql`

## Testing

- Unit tests use Jest with `passWithNoTests: true` configuration
- E2E tests are separate projects with their own configurations
- E2E test projects are excluded from the main Jest plugin configuration in `nx.json`

## NX Integration

This workspace uses NX Console and has Cursor integration configured. When working on NX-related tasks:

- Use NX MCP tools for workspace operations
- Check project dependencies with `nx_visualize_graph`
- Use `nx_workspace` tool to understand workspace architecture
- For generators, use the `nx_generators` and `nx_generator_schema` tools

---

**NOTE FOR CLAUDE: Fill in the below**

## Tech Stack

- Languages: [list primary languages]
- Frameworks: [list frameworks]
- Tools: [list tools]

## Code Style & Conventions

### Import/Module Standards

- [Specify import standards]

### Naming Conventions

- [Functions naming convention]
- [Classes/Components naming convention]
- [Constants naming convention]
- [Files naming convention]

### Patterns to Follow

- [Key architectural patterns]
- [Error handling approaches]
- [Code organisation principles]

## Development Workflow

- Branch strategy
- Commit message format
- PR requirements

## Testing Strategy

- Test frameworks
- Coverage requirements
- Test naming conventions

## Environment Setup

- Required environment variables
- Setup commands
- Local development server

## Common Commands

```bash
# Build command
[command]

# Test command
[command]

# Lint command
[command]

# Check command
[command]

# Development server
[command]
```

## Project Structure

Key directories and their purpose:

- `/src` - [description]
- `/tests` - [description]
- [other important directories]

## Review Process Guidelines

Before submitting any code, ensure the following steps are completed:

1. **Run all lint, check and test commands**

2. **Review outputs and iterate until all issues are resolved**

3. **Assess compliance**:
   For each standard, explicitly state ✅ or ❌ and explain why:

   - Code style and formatting
   - Naming conventions
   - Architecture patterns (refer to `ARCHITECTURE.md`)
   - Error handling
   - Test coverage
   - Documentation

4. **Self-review checklist**:
   - [ ] Code follows defined patterns
   - [ ] No debug/commented code
   - [ ] Error handling implemented
   - [ ] Tests written and passing
   - [ ] Documentation updated

## Known Issues & Workarounds

Document any current limitations or workarounds Claude should be aware of.

## References

Links to relevant external documentation, design docs, or resources.
