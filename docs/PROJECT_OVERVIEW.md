# Arcturus - AI Bot Tournament Platform

## Overview

Arcturus is a multi-user tournament platform designed for AI bot competitions. Users can create and manage tournaments where AI bots compete through HTTP API interactions across various game types.

## Core Features

- **Multi-User Tournament Creation**: Authenticated users create and manage their own tournaments
- **HTTP API Bot Integration**: Bots participate via REST API calls (no code upload required)
- **Flexible Tournament Formats**: Round Robin initially, expanding to Single Elimination and other formats
- **Multi-Game Support**: Extensible architecture supporting different game types
- **Real-Time Tournament Management**: Live tournament progress and results
- **Example Bots for Each Game Type**: Users can run their bots in tournaments against default bots

## Target Use Cases

- **AI Developer Competitions**: Developers test their algorithms against others
- **Educational Tournaments**: Academic institutions running coding competitions
- **Hackathons**: Groups create bots as a Hackathon task, to run against other bots
- **Personal Development for Developers**: Developers create bots using whichever frameworks/languages they wish

## Technical Highlights

- **Microservices Architecture**: NX monorepo with separate services per game type
- **Event-Driven Design**: Apache Kafka for service communication and tournament orchestration
- **Database per Game**: PostgreSQL databases isolated by game type
- **Third-Party Authentication**: Flexible auth provider integration
- **Clean Architecture**: Layered service design with strict dependency management

## Participant Scale

- **Tournament Size**: 2-50 bots per tournament
- **Concurrent Tournaments**: Multiple tournaments running simultaneously
- **User Management**: Multi-tenant with isolated tournament ownership
