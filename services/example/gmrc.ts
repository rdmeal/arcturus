// Graphile Migrate's configuration, loaded through `.gmrc.cjs` because Graphile
// Migrate can't load TypeScript itself. How migrations are written is in
// docs/patterns/database-migration.md.
import { join } from "node:path";

import { config as loadEnvFiles } from "dotenv";
import type { Settings } from "graphile-migrate";

// The same files, in the same order, as `src/config.ts`, so `.env` overrides
// `.env.development` and real environment variables win over both. Graphile
// Migrate reads DATABASE_URL, SHADOW_DATABASE_URL and ROOT_DATABASE_URL from the
// environment itself.
loadEnvFiles({
  path: [join(import.meta.dirname, ".env"), join(import.meta.dirname, ".env.development")],
  quiet: true,
});

export const settings = {
  // schema.sql is dumped from the shadow database only. It is rebuilt from the
  // committed migrations alone, so the dump matches what is committed, and the
  // dump never runs in tests. pg_dump runs inside the Compose container, so the
  // host needs no Postgres tools. It takes the database name rather than
  // GM_DBURL, whose host port may differ.
  afterAllMigrations: [
    {
      _: "command",
      shadow: true,
      command:
        'docker compose exec -T postgres pg_dump --username=postgres --schema-only --no-owner --no-privileges --exclude-schema=graphile_migrate --exclude-schema=graphile_worker "$GM_DBNAME" > schema.sql',
    },
  ],

  blankMigrationContent:
    "-- Write the migration here, following docs/patterns/database-migration.md.\n",
} satisfies Settings;
