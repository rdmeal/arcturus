# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Arcturus is a microservices-based tournament platform built with NX monorepo architecture. It consists of:

- **Tournament Runner Service**: Core tournament orchestration service
- **Game-Specific Runner Services**: Individual game implementations (currently Rock-Paper-Scissors)
- **Database Layer**: PostgreSQL with Flyway migrations per game

## Architecture

### Tech Stack

- **Languages**: TypeScript, SQL
- **Backend**: NestJS, Node.js 18+, KafkaJS, TypeORM
- **Frontend**: React 18, NX React plugin, React Query (server state)
- **Database**: PostgreSQL 14+, Flyway migrations per database
- **Messaging**: Apache Kafka with KafkaJS client
- **Testing**: Jest (unit), Playwright (E2E), Contract testing
- **Tools**: NX, Yarn, Docker, Prettier, ESLint

### Monorepo Structure

- Uses NX workspace with Yarn package manager
- Each service is a separate NX project with its own `project.json`
- Services are NestJS applications compiled with Webpack
- Database migrations are isolated per game in `games/[game-name]/database/migrations/`
- `/docs` - Architecture, ADRs, project documentation

### Service Architecture

- **Event-Driven Communication**: Apache Kafka primary messaging, HTTP for synchronous operations
- **Core Services**: Tournament Runner, Game Runners (per game), User Management, Frontend (React SPA)
- **Clean Architecture Layers**: Controllers → Services → Repositories (strict dependency flow)
- **Tournament Orchestration**: Event-driven workflow (tournament.created → match.scheduled → match.completed)
- **Database Schema**: UUIDs for primary keys, enum types for game moves, per-game database isolation

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

### Testing Strategy

- **Unit Tests**: Jest, business logic coverage, mocked dependencies
- **Integration Tests**: Service layer testing with test database
- **Contract Tests**: Bot API interaction validation
- **E2E Tests**: Playwright for critical tournament flows
- **Test Naming**: `should_[expected_behavior]_when_[condition]`

## NX Integration

This workspace uses NX Console and has Cursor integration configured. When working on NX-related tasks:

- Use NX MCP tools for workspace operations
- Check project dependencies with `nx_visualize_graph`
- Use `nx_workspace` tool to understand workspace architecture
- For generators, use the `nx_generators` and `nx_generator_schema` tools

## Code Style & Conventions

- TypeScript strict mode compliance
- No `any` types without justification
- Proper dependency injection
- Swagger documentation for public APIs

### Import/Module Standards

- Absolute imports using TypeScript path mapping
- Group imports: external libs → internal modules → relative imports
- Named exports preferred over default exports
- Barrel exports for module boundaries

### Naming Conventions

- **Functions**: camelCase, verb-noun pattern (`createTournament`, `validateBot`)
- **Classes/Services**: PascalCase with domain suffix (`TournamentService`, `BotRepository`)
- **Constants**: SCREAMING_SNAKE_CASE (`MAX_TOURNAMENT_SIZE`, `DEFAULT_TIMEOUT`)
- **Files**: kebab-case matching class name (`tournament.service.ts`, `bot.repository.ts`)
- **Interfaces**: PascalCase with 'I' prefix for abstractions (`ITournamentRepository`)

### Patterns to Follow

- **Clean Architecture**: Controllers → Services → Repositories (no layer skipping)
- **Domain-Driven Naming**: Use tournament domain language (Tournament, Bot, Match, not generic terms)
- **Dependency Injection**: Constructor injection with readonly properties
- **Error Handling**: Custom domain exceptions with standardized HTTP status mapping

## Development Workflow

- **Branch Strategy**: Feature branches from main, squash merge PRs
- **Commit Format**: Conventional commits (`feat:`, `fix:`, `docs:`, `test:`)
- **PR Requirements**: Automated checks pass, squash merge, protected main branch

## Environment Setup

Required environment variables per service in `.env` files:

- `DATABASE_URL`, `KAFKA_BROKERS`, `AUTH_PROVIDER_*`

Setup commands:

```bash
nvm use && corepack enable && yarn install
```

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

## References

- [Architecture Specification](docs/ARCHITECTURE.md)
- [Project Overview](docs/PROJECT_OVERVIEW.md)
- [Clean Architecture Principles](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
