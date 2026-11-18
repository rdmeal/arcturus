---
type: adr
status: accepted
date: 2026-11-17
summary: The web frontend uses react-i18next from its first screen, with English only for now, because adding translation keys to an existing UI is the expensive direction.
tags: [tech-stack, frontend]
---

# Set up translations from the start

## Context

The web frontend (see [Build the frontend as a React single-page app](./0014-build-the-frontend-as-a-react-spa.md)) will only be in English for the foreseeable future. Translating it later is possible, but it means finding and replacing every hard-coded string across every screen, which grows with the app. Starting with translation keys costs a small, fixed amount per string.

## Decision

We will use react-i18next in the web frontend from its first screen. All user-facing text goes through it. English is the only language for now.

## Consequences

- Adding a language later means adding translation files, not reworking screens.
- Every string needs a key and an entry, a small extra step each time.
- Dates, numbers and plurals go through the same framework, so they are handled consistently.
- User-facing text that comes from games (such as names and descriptions) is a separate question, for the game protocol.

## Alternatives considered

- **Adding translations when a second language is wanted:** cheaper now, but the retrofit gets more expensive with every screen built in the meantime.
