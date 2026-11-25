import { Client } from "pg";
import { describe, expect, onTestFinished, test } from "vite-plus/test";

import { cloneDatabase } from "./clone-database.ts";

const connect = async (connectionString: string): Promise<Client> => {
  const client = new Client({ connectionString });
  await client.connect();
  onTestFinished(async () => {
    await client.end();
  });
  return client;
};

const publicTables = async (connectionString: string): Promise<string[]> => {
  const client = await connect(connectionString);
  const result = await client.query<{ table_name: string }>(
    "select table_name from information_schema.tables where table_schema = 'public'",
  );
  return result.rows.map((row) => row.table_name);
};

const databaseExists = async (connectionString: string, name: string): Promise<boolean> => {
  const client = await connect(connectionString);
  const result = await client.query("select 1 from pg_database where datname = $1", [name]);
  return result.rowCount === 1;
};

describe("cloneDatabase", () => {
  test("a cloned database starts empty", async () => {
    const database = await cloneDatabase({ prefix: "clone", onCleanup: onTestFinished });

    expect(await publicTables(database.connectionString)).toStrictEqual([]);
  });

  test("a table created in one test's database doesn't exist in another's", async () => {
    const first = await cloneDatabase({ prefix: "clone", onCleanup: onTestFinished });
    const second = await cloneDatabase({ prefix: "clone", onCleanup: onTestFinished });
    const client = await connect(first.connectionString);
    await client.query("create table things (id int)");

    expect(await publicTables(first.connectionString)).toStrictEqual(["things"]);
    expect(await publicTables(second.connectionString)).toStrictEqual([]);
  });

  test("the database is dropped when the test ends", async () => {
    const cleanups: (() => Promise<void>)[] = [];
    const database = await cloneDatabase({
      prefix: "clone",
      onCleanup: (cleanup) => {
        cleanups.push(cleanup);
      },
    });
    const witness = await cloneDatabase({ prefix: "clone", onCleanup: onTestFinished });

    await Promise.all(cleanups.map((cleanup) => cleanup()));

    expect(await databaseExists(witness.connectionString, database.name)).toBe(false);
  });

  test("several databases can be cloned at once", async () => {
    const databases = await Promise.all(
      Array.from({ length: 8 }, () =>
        cloneDatabase({ prefix: "clone", onCleanup: onTestFinished }),
      ),
    );

    expect(new Set(databases.map((database) => database.name)).size).toBe(8);
  });
});
