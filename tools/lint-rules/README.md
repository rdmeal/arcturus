# @arcturus/lint-rules

The repository's local Oxlint JS plugin, loaded through `jsPlugins` in the root `vite.config.ts`. Its rules are prefixed `arcturus/`.

What lint enforces, and why each rule exists, is in [Linting](../../docs/develop/linting.md).

## Rules

- **`arcturus/disable-needs-reason`:** every `oxlint-` or `eslint-` disable or enable comment must give its reason after `--`.

## Testing

From the repository root, `vp test tools/lint-rules`.
