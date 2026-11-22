---
type: adr
status: accepted
date: 2026-11-22
summary: Dependencies install only once they are a week old, never at a lower trust level than earlier releases, and run build scripts only when reviewed by name, while CI actions are pinned by commit SHA and container images, in CI and Docker Compose, by digest, so a compromised release is likely caught before it reaches the repo.
tags: [tooling, security]
---

# Guard the dependency supply chain

## Context

Every package in the repository installs from the npm registry through pnpm (see [Organise the repository as pnpm package-based workspaces](./0016-organise-the-repository-as-pnpm-workspaces.md)), CI runs third-party GitHub Actions and container images (see [Compose CI from reusable workflows](./0019-compose-ci-from-reusable-workflows.md)), and local development runs container images through Docker Compose (see [Run infrastructure in Compose and services on the host](./0030-run-infrastructure-in-compose-and-services-on-the-host.md)). A compromised release of any of them runs code on the maintainer's machine and in CI. Most such attacks have run through `postinstall` scripts, published under a stolen account without the package's usual provenance, and been detected and pulled within days.

pnpm 11 introduced supply-chain defaults that pnpm 12 keeps: dependency build scripts are blocked unless allowed by name (`strictDepBuilds`), transitive dependencies can't come from git or tarball URLs (`blockExoticSubdeps`), and new releases wait a day before installing (`minimumReleaseAge: 1440`). As of November 2026, the repository pins pnpm 12.19.0.

The repository is maintained by one person, who rarely needs the newest version of a package the day it comes out.

## Decision

We will follow [pnpm's supply-chain guidance](https://pnpm.io/supply-chain-security), with a longer delay than its default:

- **A one-week release age:** `minimumReleaseAge: 10080` in `pnpm-workspace.yaml`, so pnpm won't install a version published less than a week ago.
- **No trust downgrades:** `trustPolicy: no-downgrade`, so pnpm refuses a version with weaker publishing evidence (such as no provenance) than the package's earlier releases.
- **Build scripts by name only:** `strictDepBuilds` and `blockExoticSubdeps` stay on, and `allowBuilds` starts empty. A dependency that needs a build script is added to `allowBuilds` by name, after its script has been reviewed.
- **Pinned actions and images:** third-party GitHub Actions are pinned to a full commit SHA, and container images, in CI and in Docker Compose, to a digest, with the version visible beside it (`postgres:<version>@sha256:…`, or a comment for actions).
- **A committed lockfile:** `pnpm-lock.yaml` is committed, so every install resolves the same versions.

## Consequences

- These are checks on how a dependency is added, not a reason to avoid adding one. When an established library does the job, we prefer it to writing our own, and it goes through these checks like any other dependency.
- A malicious release that is caught within a week never reaches the repository, and one that is caught later still can't run an install script unless it was already reviewed and allowed.
- New versions, including fixes, arrive at least a week late. A fix that is needed sooner has to be let through deliberately, as a named exception in `pnpm-workspace.yaml`.
- `vp install` can fail when a package's publishing evidence weakens, or when a new dependency has a build script. Both need a human decision: check that the release is genuine and add a named exclusion, or review the script and add the package to `allowBuilds`.
- Pinned actions and images don't update themselves. Each update means looking up the new SHA or digest, by hand or with a tool chosen later.
- When the version pinned in `packageManager` is bumped, the new pnpm version has to be at least a week old too, and its defaults checked against this decision.

## Alternatives considered

- **pnpm's one-day default delay:** catches most attacks, but the maintainer gains little from newer versions, so the longer delay costs almost nothing and covers attacks that take longer to detect.
- **Pinning actions by version tag:** simpler to read and update, but a tag can be moved to different code, while a commit SHA or image digest can't.
