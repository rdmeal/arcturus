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
  - Event publishing (tournament.created, tournament.started)
  - Results aggregation
- **Dependencies**: Central DB, Kafka Producer

#### Game Runner Services (per game type)
- **Purpose**: Game-specific tournament execution
- **Responsibilities**:
  - Match scheduling and execution
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

#### Frontend Service (React SPA)
- **Purpose**: Tournament management interface
- **Responsibilities**:
  - Tournament creation/management UI
  - Real-time tournament viewing
  - Bot registration interface
- **Dependencies**: Tournament APIs, WebSocket connections

### Event Flow

```
User Creates Tournament → tournament.created event
↓
Game Runner subscribes → schedules matches → match.scheduled events
↓
Match execution → bot API calls → match.completed events
↓
Tournament Runner aggregates → tournament.completed event
```

## Data Architecture

### Central Database Schema
```sql
- users (id, auth_provider_id, email, created_at)
- tournaments (id, user_id, game_type, format, status, config)
- bots (id, tournament_id, name, api_url, status)
- tournament_results (id, tournament_id, final_standings)
```

### Game Database Schema (per game)
```sql
- matches (id, tournament_id, bot_alpha_id, bot_bravo_id, status, moves, result)
- match_history (id, match_id, sequence, bot_id, move, timestamp)
- bot_performance (id, bot_id, tournament_id, wins, losses, avg_response_time)
```

## External Integrations

### Bot API Contract
```typescript
interface BotAPI {
  POST /move: {
    gameState: GameState,
    timeLimit: number
  } → { move: Move }
  
  GET /health → { status: 'ready' | 'busy' | 'error' }
}
```

### Authentication Provider
- **JWT Token Validation**: Middleware on protected endpoints
- **User Profile Sync**: Periodic user data synchronization
- **Authorization**: Role-based access control for tournament ownership

## Technology Stack

### Backend Services
- **Runtime**: Node.js 18+
- **Framework**: NestJS with TypeScript
- **Build**: Webpack via NX
- **Testing**: Jest (unit), Playwright (E2E)

### Data Layer
- **Primary Database**: PostgreSQL 14+
- **Migrations**: Flyway per database
- **ORM**: TypeORM for type safety
- **Messaging**: Apache Kafka with KafkaJS

### Frontend
- **Framework**: React 18 with TypeScript
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
├── tournament-runner/ (NestJS)
├── games/rock-paper-scissors/runner/ (NestJS)
├── user-management/ (NestJS)
├── frontend/ (React)
└── shared/types/ (TypeScript definitions)
```

### Service Dependencies
- Tournament Runner ← Kafka → Game Runners
- User Management → Auth Provider
- Frontend → All Backend Services (HTTP)
- All Services → PostgreSQL (respective databases)

## Security Considerations

### Authentication Flow
1. Frontend redirects to auth provider
2. Provider returns JWT token
3. Backend validates token on each request
4. User context attached to requests

### Bot API Security
- **Timeout Handling**: 5-second move timeout
- **Rate Limiting**: Max requests per tournament
- **Input Validation**: Strict move validation
- **Error Isolation**: Bot failures don't crash tournaments

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