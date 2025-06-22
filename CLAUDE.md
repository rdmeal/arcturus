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