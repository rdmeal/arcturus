---
type: adr
status: accepted
date: 2026-11-22
summary: Compose runs the single grafana/otel-lgtm container (collector, Grafana, Loki, Tempo, Prometheus) with the rest of the infrastructure, because one image covers every signal locally and services run normally without it.
tags: [tooling, local-development, observability]
---

# Run grafana/otel-lgtm as the local observability backend

## Context

Locally, Docker Compose runs only infrastructure, and services run on the host (see [Run infrastructure in Compose and services on the host](./0030-run-infrastructure-in-compose-and-services-on-the-host.md)). That ADR left room in Compose for an observability backend. Services send traces and logs as OTLP (see [Use OpenTelemetry for backend traces and logs](./0038-use-opentelemetry-for-backend-telemetry.md)), so the local backend needs an OTLP endpoint, somewhere to search traces and logs, and links between the two.

Grafana publishes `grafana/otel-lgtm`: a single image with an OpenTelemetry collector, Grafana, Loki (logs), Tempo (traces) and Prometheus (metrics), documented for development and testing rather than production. As of November 2026 it takes from a few hundred MB to about 1 GB of memory.

A trace can't be collected after the event. If the backend isn't running when something odd happens, that telemetry is gone.

## Decision

We will run `grafana/otel-lgtm` in `compose.yaml`, pinned by digest (see [Guard the dependency supply chain](./0020-guard-the-dependency-supply-chain.md)), and start it with the rest of the infrastructure:

- **No service depends on it.** Starting the infrastructure waits only for Postgres, and services start and run normally while otel-lgtm is down.
- **OTLP is on its standard ports, 4317 (gRPC) and 4318 (HTTP).** These are the OTel SDK's defaults, so no service needs an endpoint setting.
- **Grafana is published on host port 3300**, because its default, 3000, is the tournament runner's port.

## Consequences

- Traces and logs from every host-run service are in one Grafana, linked to each other, with no setup beyond starting the infrastructure.
- The local stack uses more memory, even when nobody is looking at telemetry.
- One image is one thing to keep up to date. Its components can't be upgraded separately, which doesn't matter for local use.
- It says nothing about production. The production backend is chosen once hosting is.
- The ports go in the ports table in [Local development](../develop/local-development.md).

## Alternatives considered

- **The Aspire dashboard:** one light container for every signal, but its storage is in memory only and it has no query language. Good for viewing one trace, weak for investigating.
- **Jaeger all-in-one:** traces only, so logs would need another tool.
- **SigNoz, Uptrace or OpenObserve:** complete products, but several containers each, or ClickHouse, to maintain.
- **A Compose profile that has to be started on purpose:** lighter, but it has to be remembered, and the telemetry from before it was started is lost.
