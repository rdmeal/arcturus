import { EventEmitter } from "node:events";

import { cloneDatabase } from "@arcturus/test-database";
import { Logger, runMigrations, runOnce } from "graphile-worker";
import type { TaskList, WorkerEvents } from "graphile-worker";
import { describe, expect, onTestFinished, test } from "vite-plus/test";
import { z } from "zod";

import { captureLog } from "../test/capture-log.ts";
import {
  addJob,
  ConflictError,
  createDatabase,
  createTaskList,
  defineTask,
  log,
  openWorkerPool,
  sql,
  startWorker,
} from "./index.ts";
import type { Database } from "./index.ts";

const quietLogger = new Logger(() => () => {
  // graphile-worker's own lines would only clutter the test output.
});

// An empty database of the test's own, with graphile-worker's schema.
const openJobDatabase = async (): Promise<{ db: Database; connectionString: string }> => {
  const { connectionString } = await cloneDatabase({ prefix: "jobs", onCleanup: onTestFinished });
  const pool = openWorkerPool(connectionString);
  await runMigrations({ pgPool: pool, logger: quietLogger });
  await pool.end();
  const { db, close } = await createDatabase({ connectionString });
  onTestFinished(close);
  return { db, connectionString };
};

/** Runs every job that can run now, and returns the errors the jobs threw. */
const runQueuedJobs = async (connectionString: string, taskList: TaskList): Promise<unknown[]> => {
  const errors: unknown[] = [];
  // oxlint-disable-next-line unicorn/prefer-event-target -- graphile-worker's `events` option is a Node EventEmitter
  const events: WorkerEvents = new EventEmitter();
  events.on("job:error", ({ error }) => {
    errors.push(error);
  });
  const pool = openWorkerPool(connectionString);
  await runOnce({ pgPool: pool, taskList, events, logger: quietLogger, noHandleSignals: true });
  await pool.end();
  return errors;
};

const queuedJobs = (db: Database) =>
  db.read((connection) =>
    connection.any(sql.type(z.object({ taskIdentifier: z.string(), attempts: z.number() }))`
      select task_identifier as "taskIdentifier", attempts
      from graphile_worker.jobs
    `),
  );

const countPayload = z.object({ count: z.number().int().positive() });

const countTask = (handler: (deps: unknown, payload: { count: number }) => Promise<void>) =>
  defineTask("testing.count", countPayload, handler);

describe("addJob", () => {
  test("a job queued in a transaction that commits is queued", async () => {
    const { db, connectionString } = await openJobDatabase();
    const received: unknown[] = [];
    const task = countTask((_deps, payload) => {
      received.push(payload);
      return Promise.resolve();
    });

    await db.transaction((connection) => addJob(connection, task, { count: 3 }));
    const errors = await runQueuedJobs(connectionString, createTaskList([task], {}));

    expect(errors).toStrictEqual([]);
    expect(received).toStrictEqual([{ count: 3 }]);
  });

  test("a job queued in a transaction that throws is rolled back with the transaction's rows", async () => {
    const { db } = await openJobDatabase();
    const task = countTask(() => Promise.resolve());
    await db.transaction((connection) =>
      connection.query(sql.typeAlias("void")`create table things (id int primary key)`),
    );

    const queuing = db.transaction(async (connection) => {
      await connection.query(sql.typeAlias("void")`insert into things (id) values (1)`);
      await addJob(connection, task, { count: 1 });
      throw new Error("the command failed after queuing");
    });

    await expect(queuing).rejects.toThrow("the command failed after queuing");
    expect(await queuedJobs(db)).toStrictEqual([]);
    const things = await db.read((connection) =>
      connection.any(sql.type(z.object({ id: z.number() }))`select id from things`),
    );
    expect(things).toStrictEqual([]);
  });

  test("rejects a payload that doesn't match the task's schema when queued", async () => {
    const { db } = await openJobDatabase();
    const task = countTask(() => Promise.resolve());

    const queuing = db.transaction((connection) => addJob(connection, task, { count: -1 }));

    await expect(queuing).rejects.toThrow(z.ZodError);
    expect(await queuedJobs(db)).toStrictEqual([]);
  });
});

describe("createTaskList", () => {
  test("fails a job whose stored payload doesn't match the task's schema", async () => {
    const { db, connectionString } = await openJobDatabase();
    const received: unknown[] = [];
    const task = countTask((_deps, payload) => {
      received.push(payload);
      return Promise.resolve();
    });
    // Queued past addJob's check, as a job queued by older code could be.
    await db.transaction((connection) =>
      connection.query(sql.typeAlias("void")`
        select from graphile_worker.add_job('testing.count', '{"count": "three"}'::json)
      `),
    );

    const errors = await runQueuedJobs(connectionString, createTaskList([task], {}));

    expect(errors).toHaveLength(1);
    expect(errors[0]).toBeInstanceOf(z.ZodError);
    expect(received).toStrictEqual([]);
  });

  test("logs a domain error as a warning with its code and completes the job", async () => {
    const { db, connectionString } = await openJobDatabase();
    const records = captureLog();
    const task = countTask(() =>
      Promise.reject(new ConflictError("already-counted", "This count has already been made.")),
    );
    await db.transaction((connection) => addJob(connection, task, { count: 1 }));

    const errors = await runQueuedJobs(connectionString, createTaskList([task], {}));

    expect(errors).toStrictEqual([]);
    expect(await queuedJobs(db)).toStrictEqual([]);
    expect(records()).toContainEqual(
      expect.objectContaining({ level: 40, code: "already-counted", taskName: "testing.count" }),
    );
  });

  test("rethrows any other error so the job is retried", async () => {
    const { db, connectionString } = await openJobDatabase();
    const failure = new Error("the count went wrong");
    const task = countTask(() => Promise.reject(failure));
    await db.transaction((connection) => addJob(connection, task, { count: 1 }));

    const errors = await runQueuedJobs(connectionString, createTaskList([task], {}));

    expect(errors).toStrictEqual([failure]);
    expect(await queuedJobs(db)).toStrictEqual([{ taskIdentifier: "testing.count", attempts: 1 }]);
  });

  test("log lines written by a job carry its job ID, task name and attempt", async () => {
    const { db, connectionString } = await openJobDatabase();
    const records = captureLog();
    const task = countTask(() => {
      log.info("counting");
      return Promise.resolve();
    });
    await db.transaction((connection) => addJob(connection, task, { count: 1 }));

    await runQueuedJobs(connectionString, createTaskList([task], {}));

    const counting = records().find((record) => record.msg === "counting");
    expect(counting).toMatchObject({ taskName: "testing.count", attempt: 1 });
    expect(counting?.jobId).toMatch(/^\d+$/u);
  });
});

describe("startWorker", () => {
  test("a started worker runs a queued job", async () => {
    const { db, connectionString } = await openJobDatabase();
    const { promise: ran, resolve: hasRun } = Promise.withResolvers<unknown>();
    const task = countTask((_deps, payload) => {
      hasRun(payload);
      return Promise.resolve();
    });
    const worker = await startWorker({ connectionString, taskList: createTaskList([task], {}) });
    onTestFinished(worker.stop);

    await db.transaction((connection) => addJob(connection, task, { count: 2 }));

    expect(await ran).toStrictEqual({ count: 2 });
  });

  test("a worker is running until it is stopped", async () => {
    const { connectionString } = await openJobDatabase();
    const worker = await startWorker({ connectionString, taskList: {} });
    onTestFinished(worker.stop);
    expect(worker.isRunning()).toBe(true);

    await worker.stop();

    expect(worker.isRunning()).toBe(false);
  });
});
