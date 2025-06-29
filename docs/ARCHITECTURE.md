# Arcturus Architecture Specification

## System Overview

Arcturus is an event-driven microservices platform for AI bot tournaments, built on NX monorepo architecture with per-game database isolation.

## Core Architectural Principles

### Clean Architecture

- **Controllers**: HTTP endpoints, request validation, response formatting
- **Services**: Business logic, domain operations, external integrations
- **Repositories**: Data access layer, database abstractions
- **Dependencies**: Controllers → Services → Repositories (strict layering)

### Event-Driven Communication

- **Apache Kafka**: Primary inter-service messaging
- **Event Types**: Tournament lifecycle, match scheduling, result processing
- **Async Processing**: Non-blocking tournament operations

### Database per Game Pattern

- **Central Database**: Users, tournaments, bot registrations, auth tokens
- **Game Databases**: Match data, game-specific state, performance metrics
- **Isolation**: Game failures don't affect platform or other games

## Service Architecture

### Core Services

#### Tournament Runner Service

- **Purpose**: Tournament orchestration and lifecycle management
- **Responsibilities**:
  - Tournament creation/deletion
  - Bot registration/validation
  - Match scheduling
  - Event publishing (match.started)
  - Results aggregation
- **Dependencies**: Central DB, Kafka Consumer/Producer

#### Game Runner Services (per game type)

- **Purpose**: Game-specific tournament execution
- **Responsibilities**:
  - Match execution
  - Bot API communication
  - Result calculation and publishing
- **Dependencies**: Game DB, Kafka Consumer/Producer, HTTP Client

#### User Management Service

- **Purpose**: Authentication and user operations
- **Responsibilities**:
  - Auth provider integration
  - User session management
  - Authorization middleware
- **Dependencies**: Central DB, Auth Provider APIs

#### Tournament Manager App (React SPA)

- **Purpose**: Tournament management interface
- **Location**: `/apps/tournament-manager/`
- **Responsibilities**:
  - Tournament creation/management UI
  - Real-time tournament viewing
  - Bot registration interface
- **Dependencies**: Tournament APIs, WebSocket connections

### Event Flow

```
User Creates Tournament → tournament.created event
↓
Tournament Runner schedules matches -> Starts each match -> match.started events
↓
Game Runner subscribes to match events → Match execution → bot API calls → match.completed events
↓
Tournament Runner subscribes to match complete events -> Schedules next round of matches -> match.started events
↓
Tournament Runner, when no more matches to schedule -> tournament.completed event
```

## Data Architecture

### Central Database Schema

```sql
- user (id, auth_provider_id, email, created_at)
- tournament (id, user_id, game_type, format, status, config)
- bot (id, tournament_id, name, url)
```

### Game Database Schema (per game)

Each game has a different schema to suit the game's needs, but most have at least a BOT and MATCH table.

```sql
- bot (id, url)
- match (id, created_at)
```

## External Integrations

### Bot API Contract

Each game type publishes an API contract that it expects each bot to adhere to. The general flow for each game will be:

- **Game Runner calls the bot's URL with an HTTP POST request** - The body will be game type specific, but generally includes the history of moves in the current match, the current game state, the match ID and the bot ID.
- **Bot calls an HTTP endpoint that the Game Runner exposes** - This call will include the move the bot is making, its bot ID and the match ID.

### Authentication Provider

- **JWT Token Validation**: Middleware on protected endpoints
- **Authorization**: Role-based access control for tournament ownership

## Technology Stack

### Backend Services

- **Runtime**: Node.js 22+
- **Framework**: NestJS with TypeScript
- **Build**: Webpack via NX
- **Testing**: Jest (unit), Jest with supertest (Integration)

### Data Layer

- **Primary Database**: PostgreSQL 17+
- **Migrations**: Flyway per database
- **ORM**: Slonik
- **Messaging**: Apache Kafka with KafkaJS

### Frontend

- **Framework**: React 19 with TypeScript
- **Build**: NX React plugin
- **Styling**: Component library (TBD)
- **State**: React Query for server state

### Infrastructure

- **Containerization**: Docker per service
- **Orchestration**: Docker Compose (development)
- **Monitoring**: Health endpoints, structured logging

## Deployment Architecture

### Development Environment

```
NX Workspace
├── apps/
│   └── tournament-manager/ (React SPA)
├── docs/ (Architecture, ADRs, project documentation)
├── games/
│   └── [game-name]/
│       ├── runner/ (NestJS game service)
│       └── database/ (Game-specific DB & migrations)
├── shared/
│   ├── types/ (TypeScript definitions)
│   ├── utils/ (Common utilities)
│   └── constants/ (Shared constants)
└── tournament-runner/ (NestJS orchestration service)
```

#### Monorepo Structure

- Uses NX workspace with Yarn package manager
- Each service is a separate NX project with its own `project.json`
- Services are NestJS applications compiled with Webpack
- Database migrations are isolated per game in `games/[game-name]/database/migrations/`

### Service Dependencies

- Tournament Runner ← Kafka → Game Runners
- User Management → Auth Provider
- Tournament Manager App → All Backend Services (HTTP)
- All Services → PostgreSQL (respective databases)
- Shared Libraries → Used by all services and apps

## Security Considerations

### Authentication Flow

1. Frontend redirects to auth provider
2. Provider returns JWT token
3. Backend validates token on each request
4. User context attached to requests

### Bot API Security

- **Timeout Handling**: Configurable move timeout
- **Rate Limiting**: Max requests per tournament
- **Input Validation**: Strict move validation
- **Error Isolation**: Bot failures don't crash tournaments
- **Bot and Match IDs**: Call to bots provides both bot and match IDs, response from bot requires these IDs

## Scalability Patterns

### Horizontal Scaling

- **Stateless Services**: All services can run multiple instances
- **Event Partitioning**: Kafka partitions by tournament ID
- **Database Sharding**: Game databases can shard by tournament

### Performance Optimizations

- **Connection Pooling**: Database connection reuse
- **Event Batching**: Group related events for processing
- **Caching**: Tournament state caching during active matches

## Error Handling Strategy

### Service-Level Error Handling

- **Graceful Degradation**: Continue tournament if single bot fails
- **Retry Logic**: Exponential backoff for bot API calls
- **Circuit Breakers**: Disable problematic bots automatically

### Cross-Service Error Propagation

- **Error Events**: Publish service errors to Kafka
- **Compensation**: Rollback mechanisms for failed tournaments
- **Monitoring**: Centralized error aggregation and alerting
