import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";

import { Client, escapeIdentifier } from "pg";
import { describe, expect, inject, onTestFinished, test } from "vite-plus/test";

import { administer } from "./administer.ts";
import { buildTemplate } from "./build-template.ts";
import { cloneDatabase } from "./clone-database.ts";
import { connectionString } from "./provided-context.ts";

const migrationsFolder = fileURLToPath(new URL("../test/fixtures/migrations", import.meta.url));

// Builds a template from the fixture migrations, removed when the test ends.
const builtTemplate = async (): Promise<string> => {
  const server = inject("testDatabaseServer");
  const name = `fixture_${randomBytes(6).toString("hex")}_template`;
  onTestFinished(async () => {
    await administer(server, `alter database ${escapeIdentifier(name)} with is_template false`);
    await administer(server, `drop database ${escapeIdentifier(name)} with (force)`);
  });
  await buildTemplate({ server, name, migrationsFolder });
  return name;
};

const query = async (database: string, statement: string): Promise<Record<string, unknown>[]> => {
  const client = new Client({ connectionString: database });
  await client.connect();
  try {
    const result = await client.query<Record<string, unknown>>(statement);
    return result.rows;
  } finally {
    await client.end();
  }
};

describe("buildTemplate", () => {
  test("a database cloned from a built template has its migrated tables and the graphile_worker schema", async () => {
    const template = await builtTemplate();
    const database = await cloneDatabase({
      prefix: "fixture",
      template,
      onCleanup: onTestFinished,
    });

    expect(
      await query(
        database.connectionString,
        "select table_name from information_schema.tables where table_schema = 'public'",
      ),
    ).toStrictEqual([{ table_name: "widgets" }]);
    expect(
      await query(
        database.connectionString,
        "select schema_name from information_schema.schemata where schema_name = 'graphile_worker'",
      ),
    ).toStrictEqual([{ schema_name: "graphile_worker" }]);
  });

  test("a built template accepts no connections", async () => {
    const template = await builtTemplate();

    await expect(
      query(connectionString(inject("testDatabaseServer"), template), "select 1"),
    ).rejects.toThrow(/not currently accepting connections/u);
  });

  test("several databases can be cloned from the same template at once", async () => {
    const template = await builtTemplate();

    const databases = await Promise.all(
      Array.from({ length: 8 }, () =>
        cloneDatabase({ prefix: "fixture", template, onCleanup: onTestFinished }),
      ),
    );

    expect(new Set(databases.map((database) => database.name)).size).toBe(8);
  });
});
