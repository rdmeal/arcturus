import { EventEmitter } from "node:events";

import { openWorkerPool, workerLogger } from "@arcturus/service-runtime";
import type { TaskList, Worker } from "@arcturus/service-runtime";
import { runOnce } from "graphile-worker";
import type { WorkerEvents } from "graphile-worker";

export interface RunJobsOptions {
  /** For a test about retries: a job that fails is left to retry instead of failing the test. */
  readonly allowFailures?: boolean;
}

const describeError = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/**
 * Runs the queued jobs until none can run now. A job that throws anything
 * other than a domain error fails the test, unless `allowFailures` is set
 * (docs/patterns/service-api-test.md rule 11).
 */
export const runQueuedJobs = async (
  connectionString: string,
  taskList: TaskList,
  { allowFailures = false }: RunJobsOptions = {},
): Promise<void> => {
  const errors: unknown[] = [];
  const failures: string[] = [];
  // oxlint-disable-next-line unicorn/prefer-event-target -- graphile-worker's `events` option is a Node EventEmitter
  const events: WorkerEvents = new EventEmitter();
  events.on("job:error", ({ job, error }) => {
    errors.push(error);
    failures.push(
      `${job.task_identifier} (job ${job.id}, attempt ${job.attempts}): ${describeError(error)}`,
    );
  });
  const pool = openWorkerPool(connectionString);
  try {
    await runOnce({
      pgPool: pool,
      taskList,
      events,
      logger: workerLogger,
      noHandleSignals: true,
    });
  } finally {
    await pool.end();
  }
  if (failures.length > 0 && !allowFailures) {
    throw new AggregateError(
      errors,
      `A job failed, which fails the test unless it runs jobs with { allowFailures: true }:\n${failures.join("\n")}`,
    );
  }
};

/**
 * The worker an API test's app sees. Tests run jobs with `runJobs()` instead of
 * a live worker, so this one only reports whether it is running, until stopped.
 */
export const createTestWorker = (): Worker => {
  let running = true;
  return Object.freeze({
    isRunning: () => running,
    stop: () => {
      running = false;
      return Promise.resolve();
    },
  });
};
