---
type: adr
status: accepted
date: 2026-11-22
summary: The services' own APIs (web frontend to tournament runner, tournament runner to player gateway) carry no version prefix, header or negotiation, because every caller ships in the same release and Hono's RPC types catch breaking changes at compile time; the tournament runner's API stays private to the web frontend, and the published protocols are versioned separately.
tags: [architecture, backend]
---

# Keep the services' own APIs unversioned

## Context

Arcturus has two kinds of HTTP API:

- **The services' own APIs:** the tournament runner's API, which the web frontend calls, and the APIs the platform services call on each other, such as between the tournament runner and the player gateway. Their paths are `/<area>/<slice>` (see [Structure services as vertical slices with a task-based API](./0021-structure-services-as-vertical-slices.md)).
- **The published protocols:** the game protocol and the player protocol, which authors implement from their own repositories. [Extend Arcturus only through published protocols](./0004-extend-arcturus-through-published-protocols.md) already says these need versioning, and how they are versioned is decided with the protocols.

Every caller of a service's own API is in this repository and ships in the same release. The web frontend calls the tournament runner through Hono's RPC client, which imports the type of the tournament runner's API (see [Build the frontend as a React single-page app](./0014-build-the-frontend-as-a-react-spa.md)), so a breaking change fails the type check at every caller it affects.

Public HTTP APIs conventionally start with a version, such as a `/v1` prefix, and a contributor or coding agent may add one by habit. Nothing needs a version yet. The question is whether to add the mechanism now, before the first service is built, so it is there when it is needed.

## Decision

We will not version the services' own APIs: no version prefix in paths, no version header and no version negotiation.

- A breaking change to a service's own API is made in the same pull request as the changes to its callers.
- The tournament runner's API stays private to the web frontend. Users don't script against it. If scripting is ever wanted, for example a CI job that creates tournaments, it gets its own published, versioned contract as a separate decision, rather than the web frontend's API being made public as it stands.
- This decision covers only the services' own APIs. The game protocol and player protocol are versioned as part of their own design.

## Consequences

- Paths stay exactly `/<area>/<slice>`, with no prefix that would never change.
- No code anywhere handles more than one version of a service's own API.
- If a version is ever needed, Hono's `basePath` adds a prefix in one line. That is cheap while every caller is in this repository, which is why this decision is easy to reverse for now and is recorded mainly so that no prefix is added by convention.
- A browser tab running an older build of the web frontend can call a newer tournament runner after a deploy. How that is handled is left to the web frontend's serving design.
- Making the tournament runner's API public, or letting a service outside this repository call a service's own API, would undo this decision and needs a new ADR.

## Alternatives considered

- **A `/v1` prefix from the start:** the convention for public REST APIs, and cheap to add. It was rejected because no `/v2` will ever be needed while every caller ships in the same release. The prefix would only add noise to every path and suggest a supported public contract that doesn't exist.
- **Versioning by header or media type:** more machinery for the same lack of payoff.
