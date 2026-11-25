# @arcturus/workspace

Facts about the workspace's layout, for repository tools and test infrastructure: which packages are services, and which of them manage a database.

## Exports

- **`findMigrationPackages(root: string): Promise<string[]>`:** the service packages (in `services/` and `games/*/service`), relative to `root` and sorted, that manage a database with Graphile Migrate. A package counts when it has a Graphile Migrate configuration file: `.gmrc`, `.gmrc.js` or `.gmrc.cjs`. How migrations are written is in [database migration](../../docs/patterns/database-migration.md).

## Testing

From the repository root, after `vp install`, `vp test packages/workspace` runs the tests.
