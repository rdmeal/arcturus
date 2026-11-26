---
type: adr
status: accepted
date: 2026-11-26
summary: Each validation issue in a 400 problem-details body carries zod's own issue code, unchanged, beside its path and message, so the frontend can translate field errors; problem types stay about:blank, and clients translate only `code`.
tags: [backend, frontend]
---

# Give validation issues zod's own codes for the client to translate

## Context

[Signal expected failures with thrown domain errors](./0024-signal-expected-failures-with-thrown-domain-errors.md) gives every error body a machine-readable `code` that the frontend turns into a translation key (see [Set up translations from the start](./0015-set-up-translations-from-the-start.md)). It says request validation failures use the same shape, but not what a client can translate when one field, or several, fails validation.

Two parts of the body could identify a problem to the frontend. RFC 9457's `type` is a URI naming a kind of problem, and `about:blank` means the status says it all. Our `code` member is a short, stable string. Using both would give the frontend two keys to keep in step.

Requests are validated with zod (see [Use zod as the only schema library](./0010-use-zod-as-the-only-schema-library.md)), and every zod issue has a path, an English message, and an issue code such as `too_small` or `invalid_type`. Our domain codes are kebab-case (`message-not-found`), while zod's are snake_case. Forms will mostly validate in the browser with the same zod schemas, so field errors from the server are a fallback, but a client that can't translate them shows English to every user. The workspace uses zod 4.6 as of November 2026.

## Decision

We will make `code` the only member clients translate. `type` is always `about:blank`, and `title` and `detail` are English fallbacks.

We will answer a validation failure with 400 problem details, the code `invalid-request`, and an `issues` member listing each issue as `{ path, code, message }`:

- `path` is the field's path, joined with dots;
- `code` is zod's own issue code, passed through unchanged;
- `message` is zod's English message, as a fallback.

zod's issue parameters, such as a minimum length, are left out until the frontend needs them.

## Consequences

- The frontend can translate every error it gets: the body's `code`, and each field issue's `code`.
- No mapping from zod's codes to ours has to be written or kept up to date. The two vocabularies stay apart on purpose: a snake_case issue code is visibly zod's, not a domain code.
- The API is tied to zod's issue codes. A zod major version that renames them changes what clients receive. zod 4 has already done this once: it cut zod 3's sixteen issue codes to eleven, dropping `invalid_date` among others and adding `invalid_format`. A zod upgrade has to be checked against the frontend's translations.
- Without parameters, a translated message can't say "at least 3 characters", only that the field is too short. Adding parameters later is additive, so existing clients keep working.
- If the published protocols adopt problem details, outside clients see zod's codes too, and that choice is made with the protocols.

## Alternatives considered

- **Translate on the server, or send only English messages:** the frontend owns translation, and English-only messages leave it nothing to translate per field.
- **Map zod's codes to kebab-case codes of our own:** a second vocabulary to maintain that adds nothing a client needs, and that would drift from zod's.
- **Identify problems by `type` URIs:** standard, but a second key beside `code` for the frontend to keep in step, with nothing to serve at the URIs.
