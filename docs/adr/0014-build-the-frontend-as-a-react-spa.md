---
type: adr
status: accepted
date: 2026-11-17
summary: The web frontend is a React single-page app built with Vite and no server-side rendering, using Mantine for components, TanStack Router for typed routes and TanStack Query with Hono's RPC client for data, polling for tournament progress.
tags: [tech-stack, frontend]
---

# Build the frontend as a React single-page app

## Context

The web frontend lets users set up tournaments, register players and follow results. It calls only the tournament runner (see [Build Arcturus as independent services connected by HTTP](./0001-build-arcturus-as-services-connected-by-http.md)) and embeds game replay pages from a separate origin (see [Show replays from the game's own page on a separate origin](./0006-show-replays-from-game-pages-on-a-separate-origin.md)).

The forces:

- **A solo maintainer.** A component library that already covers tables, forms, dates and notifications saves a great deal of work.
- **No need for server rendering.** It is an app behind a login, not a public site that needs search indexing or fast first paint.
- **Types end to end.** The repository is TypeScript (see [Write the repository in TypeScript on Node](./0007-write-the-repository-in-typescript-on-node.md)), the tournament runner is built with Hono (see [Build every service with Hono, wired by hand](./0009-build-every-service-with-hono.md)), and schemas are zod (see [Use zod as the only schema library](./0010-use-zod-as-the-only-schema-library.md)). Routes, URL parameters and API calls should all be typed.
- **Slow-changing progress.** Tournament standings only change when a match finishes.
- **Replay theming.** Replay pages in iframes may want the frontend's theme tokens.

## Decision

We will build the web frontend as a React single-page app, built with Vite, with no server-side rendering, using:

- **Mantine** for components;
- **TanStack Router** for routing;
- **TanStack Query** for server data, calling the tournament runner through Hono's RPC client, which imports only the type of the tournament runner's API;
- **polling** for tournament progress while a tournament is running.

## Consequences

- Mantine covers tables, forms, date pickers, notifications and hooks, styled with plain CSS variables (no runtime styling engine, no Tailwind), with dark mode built in. Its theme is CSS variables, so theme tokens for replay iframes can come straight from it.
- Routes, route parameters and search parameters are fully typed, and search parameters can be validated with zod. Routes can start loading data through TanStack Query before they render.
- API calls are typed end to end with no code generation. The frontend depends on the tournament runner's API type, so the runner's routes must keep Hono's type inference intact.
- The frontend is static files, which keeps hosting simple.
- Polling every few seconds is simple and enough for progress that changes only when a match finishes; it costs a little more traffic than pushing updates.
- We take on the look and the release cycle of Mantine; changing component library later would touch most screens.
- Conventions for forms, state handling and frontend testing are decided when the frontend is built.

## Alternatives considered

- **shadcn/ui:** components copied into the repository and fully owned, on Radix and Tailwind. Would suit wanting full visual control or learning Tailwind, at the cost of maintaining the copied code and building data tables with TanStack Table.
- **MUI:** the most mature, but the Material look is hard to escape, its runtime CSS-in-JS adds weight, and advanced data grid features are paid.
- **Ant Design:** very rich tables and forms, but a strong enterprise look and a large bundle.
- **React Aria Components:** excellent accessibility, but unstyled, so the most styling work.
- **React Router v7:** works without server rendering, but its best type safety comes with its framework mode, which is designed around server rendering.
- **Server-side rendering:** not needed for an app behind a login.
- **An OpenAPI-generated API client:** adds a code-generation step for an API that is internal to the repository.
- **Server-Sent Events for progress:** more to build than polling, for updates that only happen when a match finishes.
