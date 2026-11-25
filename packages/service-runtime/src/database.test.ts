import { cloneDatabase } from "@arcturus/test-database";
import { SchemaValidationError, sql, UnexpectedForeignConnectionError } from "slonik";
import { describe, expect, onTestFinished, test } from "vite-plus/test";
import { z } from "zod";

import { createDatabase } from "./database.ts";
import type { Database } from "./database.ts";

// An empty database of the test's own, closed and dropped when the test ends.
const openDatabase = async (options: { lockTimeoutMs?: number } = {}): Promise<Database> => {
  const { connectionString } = await cloneDatabase({
    prefix: "runtime",
    onCleanup: onTestFinished,
  });
  const { db, close } = await createDatabase({ connectionString, ...options });
  onTestFinished(close);
  return db;
};

const withThings = async (db: Database): Promise<void> => {
  await db.transaction(async (connection) => {
    await connection.query(sql.unsafe`create table things (id int primary key)`);
    await connection.query(sql.unsafe`insert into things (id) values (1)`);
  });
};

describe("createDatabase", () => {
  test("a transaction waiting on a lock its own handler holds fails with a lock-timeout error", async () => {
    const db = await openDatabase({ lockTimeoutMs: 100 });
    await withThings(db);
    // Use two connections at once and release them, so the blocked transaction
    // runs on a reused connection, after the pool has reset it with DISCARD ALL.
    await Promise.all(
      [1, 2].map(() =>
        db.read((connection) => connection.query(sql.unsafe`select pg_sleep(0.05)`)),
      ),
    );

    const { promise: lockTaken, resolve: lockIsTaken } = Promise.withResolvers<void>();
    const { promise: released, resolve: release } = Promise.withResolvers<void>();
    // A handler that holds a row lock, then waits on work that needs the same row.
    const holder = db.transaction(async (connection) => {
      await connection.query(sql.unsafe`update things set id = 1 where id = 1`);
      lockIsTaken();
      await released;
    });
    await lockTaken;
    const waiter = db.transaction((connection) =>
      connection.query(sql.unsafe`update things set id = 1 where id = 1`),
    );

    await expect(waiter).rejects.toThrow(/lock timeout/u);
    release();
    await holder;
  });

  test("a read opened inside a transaction is rejected", async () => {
    const db = await openDatabase();

    await expect(
      db.transaction(() => db.read((connection) => connection.query(sql.unsafe`select 1`))),
    ).rejects.toThrow(UnexpectedForeignConnectionError);
  });

  test("a row that doesn't match its schema is rejected", async () => {
    const db = await openDatabase();

    await expect(
      db.read((connection) =>
        connection.one(sql.type(z.object({ id: z.string() }))`select 1 as id`),
      ),
    ).rejects.toThrow(SchemaValidationError);
  });

  test("a timestamptz column is read as a Date", async () => {
    const db = await openDatabase();

    const at = await db.read((connection) =>
      connection.oneFirst(
        sql.type(z.object({ at: z.date() }))`select '2030-01-01T00:00:00Z'::timestamptz as at`,
      ),
    );

    expect(at).toStrictEqual(new Date("2030-01-01T00:00:00Z"));
  });

  test("a transaction that throws is rolled back", async () => {
    const db = await openDatabase();
    await withThings(db);

    await expect(
      db.transaction(async (connection) => {
        await connection.query(sql.unsafe`insert into things (id) values (2)`);
        throw new Error("the handler failed");
      }),
    ).rejects.toThrow("the handler failed");

    const ids = await db.read((connection) =>
      connection.manyFirst(sql.type(z.object({ id: z.number() }))`select id from things`),
    );
    expect(ids).toStrictEqual([1]);
  });
});
