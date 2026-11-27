import { Logger, run } from "graphile-worker";
import type { JobHelpers, TaskList } from "graphile-worker";
import type { DatabaseTransactionConnection } from "slonik";
import type { z } from "zod";

import { annotate, withContextFields } from "./context.ts";
import { DomainError } from "./domain-error.ts";
import { log } from "./log.ts";
import { sql } from "./sql.ts";

/**
 * A background job's task, made by `defineTask`. Its name is stored with every
 * job queued under it, so it never changes once a job has been queued.
 */
export interface TaskDefinition<TDeps, TPayload> {
  readonly name: string;
  /** Throws unless `payload` matches the task's schema. */
  readonly check: (payload: TPayload) => void;
  /** Parses a stored payload and runs the handler with it. */
  readonly run: (deps: TDeps, payload: unknown) => Promise<void>;
}

export const defineTask = <TDeps, TSchema extends z.ZodType>(
  name: string,
  payloadSchema: TSchema,
  handler: (deps: TDeps, payload: z.output<TSchema>) => Promise<void>,
): TaskDefinition<TDeps, z.input<TSchema>> =>
  Object.freeze({
    name,
    check: (payload: z.input<TSchema>) => {
      payloadSchema.parse(payload);
    },
    run: (deps: TDeps, payload: unknown) => handler(deps, payloadSchema.parse(payload)),
  });

/**
 * Queues a job on the transaction's connection, so it commits or rolls back
 * with the data it belongs to (docs/adr/0012-run-background-jobs-with-graphile-worker.md).
 */
export const addJob = async <TPayload>(
  connection: DatabaseTransactionConnection,
  task: TaskDefinition<never, TPayload>,
  payload: NoInfer<TPayload>,
): Promise<void> => {
  task.check(payload);
  await connection.query(sql.typeAlias("void")`
    select from graphile_worker.add_job(${task.name}, ${JSON.stringify(payload)}::json)
  `);
};

const runJob = <TDeps>(
  task: TaskDefinition<TDeps, never>,
  deps: TDeps,
  payload: unknown,
  { job }: JobHelpers,
): Promise<void> =>
  withContextFields(async () => {
    annotate({ jobId: job.id, taskName: job.task_identifier, attempt: job.attempts });
    try {
      await task.run(deps, payload);
    } catch (error) {
      // A domain error means the input can never succeed, so retrying is pointless.
      if (error instanceof DomainError) {
        log.warn({ err: error, code: error.code }, "job ended with a domain error");
        return;
      }
      throw error;
    }
  });

/** graphile-worker's task list for `tasks`, each running its handler with `deps`. */
export const createTaskList = <TDeps>(
  tasks: readonly TaskDefinition<NoInfer<TDeps>, never>[],
  deps: TDeps,
): TaskList =>
  Object.fromEntries(
    tasks.map((task) => [
      task.name,
      (payload: unknown, helpers: JobHelpers) => runJob(task, deps, payload, helpers),
    ]),
  );

// graphile-worker logs every job it runs at info, so its info lines go to debug.
const workerLogLevels = { error: "error", warning: "warn", info: "debug", debug: "debug" } as const;

const workerLogger = new Logger(() => (level, message, meta) => {
  const pinoLevel = workerLogLevels[level];
  log[pinoLevel]({ ...meta, component: "graphile-worker" }, message);
});

/** A running job worker. It stops running when stopped, or if it fails. */
export interface Worker {
  readonly isRunning: () => boolean;
  /** Stops taking jobs, and resolves once the jobs in progress have finished. */
  readonly stop: () => Promise<void>;
}

export const startWorker = async (options: {
  connectionString: string;
  taskList: TaskList;
}): Promise<Worker> => {
  const runner = await run({
    connectionString: options.connectionString,
    taskList: options.taskList,
    logger: workerLogger,
    // The service's own shutdown stops the worker, before it ends the pool.
    noHandleSignals: true,
  });
  let running = true;
  const watch = async () => {
    try {
      await runner.promise;
    } catch (error) {
      log.error({ err: error }, "the job worker failed");
    } finally {
      running = false;
    }
  };
  void watch();
  let stopping: Promise<void> | undefined;
  return Object.freeze({
    isRunning: () => running,
    stop: () => {
      running = false;
      stopping ??= runner.stop();
      return stopping;
    },
  });
};
