---
type: plan
---

# Plan 08: A sent message is delivered by a job to the idempotent inbox

Implements [ticket 08](../tickets/08-sent-message-is-delivered-to-the-inbox.md), part of [the spec](../spec.md).

## Context

- **Test boundary:** mainly the example service's HTTP API, in-process, through the shared harness. `service-runtime`'s and `service-testing`'s own tests cover what the API can't reach: rollback with the transaction, an invalid payload when queued, a real worker's readiness, and MSW's strictness.
- **ADRs:**
  - [0012: Run background jobs with graphile-worker](../../../../docs/adr/0012-run-background-jobs-with-graphile-worker.md): jobs are queued with `graphile_worker.add_job()` inside the Slonik transaction, and payloads are a boundary validated when read back.
  - [0024: Signal expected failures with thrown domain errors](../../../../docs/adr/0024-signal-expected-failures-with-thrown-domain-errors.md): a domain error in a job is logged and completes the job, and any other error is retried.
  - [0033: Fake outbound HTTP in tests with MSW](../../../../docs/adr/0033-fake-outbound-http-in-tests-with-msw.md): `onUnhandledRequest: 'error'`, a default handler per endpoint, a typed recorder only on overrides, and clients never faked.
  - [0022: Open database transactions explicitly in handlers](../../../../docs/adr/0022-open-database-transactions-explicitly-in-handlers.md): `addJob` takes the transaction's connection, and the outbound call is made outside any transaction.
  - [0043: Trace each decision through jobs as its own trace](../../../../docs/adr/0043-trace-each-decision-through-jobs-as-its-own-trace.md): the `_trace` key and job spans belong to ticket 09. This ticket leaves room for them in `addJob` and `defineTask`, but doesn't build them.
  - [0020: Guard the dependency supply chain](../../../../docs/adr/0020-guard-the-dependency-supply-chain.md): MSW passes the release-age and trust checks before it's added. graphile-worker is already in the lockfile at 0.18.0, through `test-database`, so `service-runtime` takes the same version.
- **Patterns:**
  - [background-job](../../../../docs/patterns/background-job.md): the deliver-message job slice and the runtime's job API (established here).
  - [service-endpoint-mock](../../../../docs/patterns/service-endpoint-mock.md): the inbox client's handlers and `mockReceiveMessage` (established here).
  - [idempotent-receiver](../../../../docs/patterns/idempotent-receiver.md): `POST /inbox/receive-message`, and the delivery job's own idempotency (established here).
  - [database-transaction](../../../../docs/patterns/database-transaction.md): no outbound call inside a transaction; take "now" from the clock.
  - [vertical-slice](../../../../docs/patterns/vertical-slice.md), [database-migration](../../../../docs/patterns/database-migration.md), [service-api-test](../../../../docs/patterns/service-api-test.md), [service-test-data](../../../../docs/patterns/service-test-data.md), [error-handling](../../../../docs/patterns/error-handling.md), [observability](../../../../docs/patterns/observability.md), [service-composition-root](../../../../docs/patterns/service-composition-root.md).
- **Planning decisions:**
  - **`addJob(connection, task, payload)` takes the task definition, not its name.** That gives `addJob` the name, the schema and a typed payload without a registry. A command's handler imports the job slice's `task.ts` across slices. Background-job rule 5 is reworded in step 8.
  - **The runtime's job API is in `packages/service-runtime/src/jobs.ts`:** `defineTask(name, payloadSchema, handler: (deps, payload) => Promise<void>)`, `createTaskList(tasks, deps)` building graphile-worker's `TaskList`, and `startWorker({ connectionString, taskList })` returning a `Worker` (`{ isRunning(): boolean; stop(): Promise<void> }`). graphile-worker's logger is adapted to the runtime's `log`.
  - **A payload that fails validation when a job runs is a bug:** it is thrown like any other error, so it's retried and fails a test through `runJobs()`.
  - **API tests keep rule 11 (no live worker).** It makes job runs deterministic, lets a test see the state between queuing and running, turns a job's failure into the test's failure, avoids a runner per test database, and puts retries' timing under the test's control. Rule 11 gains this reasoning in step 8.
  - **The harness's `worker` fixture is a test worker** that implements `Worker`, whose jobs run through `runJobs()` and whose `stop()` makes `isRunning()` false. The example's readiness test stops it to prove the app's readiness follows its worker. A real graphile-worker runner's `isRunning()` is proven in `service-runtime`. This isn't a faked client under ADR 0033: the worker is a lifecycle component that rule 11 already replaces.
  - **`isRunning()` on a real worker turns false once the runner's `promise` settles,** whether it stopped or crashed. Confirm against graphile-worker's docs with context7 before relying on it.
  - **`createServiceTest` takes `createDeps(fixtures)`, `createApp(deps)`, `createTaskList(deps)` and `handlers`,** so the app and the tasks share one set of deps, including the inbox client. `runJobs` calls graphile-worker's `runOnce` on the test database's connection string and collects `job:error` events.
  - **MSW is a dependency of `service-testing`,** which is itself only ever a dev dependency, **and a devDependency of the example service,** whose `*.handlers.ts` import it. Lint already treats `*.handlers.ts` as test-only.
  - **The inbox client maps the inbox's answers:** a 4xx throws `RuleViolationError("delivery-rejected", …)`, so the job completes without retrying; a 5xx or a network error throws a plain error, so it is retried.
  - **`DELIVERY_URL` is the full endpoint URL** (`http://localhost:3900/inbox/receive-message` locally). The client posts to it as given.
  - **The client defines its own request schema** in `src/clients/inbox/`, rather than importing the inbox slice's, so it behaves as a client of a neighbouring service would. Its default handler matches `*/inbox/receive-message`, whatever the host.
  - **`POST /inbox/receive-message` takes `{ messageId, body }` and answers 204,** writing with `insert … on conflict do nothing`. A `GET /inbox/list-received-messages` query lets a test see that a message was stored once through the API (service-api-test rule 10), rather than through direct-db.
  - **The delivery job's payload is `{ messageId }`.** Its handler reads the message, throws `NotFoundError("message-not-found", …)` if it's missing, returns without sending if it's already delivered, calls the client, then sets `delivered_at` from the clock in its own transaction, only where it is still null.
  - **A repeated delivery job is queued through `src/test/direct-db.ts`,** with the reason "a repeated job can't be produced through the API".
  - **The migration is 000002:** `messages.delivered_at timestamptz null` and an `inbox_messages` table (`message_id uuid primary key`, `body text not null`, `received_at timestamptz not null`). The maintainer runs `db:watch` and `db:commit`, because they need local Postgres.
  - **Tests need Docker, so the maintainer runs `vp test`.** Each step's Check names the test files to run with `! vp test <path>`.

## Steps

- [x] **1. Build the app and tasks from one set of deps in the harness (prefactor, no behaviour change)**
  - **Goal:** `createServiceTest` takes `createDeps(fixtures)` and `createApp(deps)` instead of `createApp(fixtures)`, so step 4 can add `createTaskList(deps)` and the app and tasks share the deps. Every existing test still passes.
  - **Files:**
    - `packages/service-testing/src/create-service-test.ts`: the options become `createDeps: (fixtures: { config: TConfig; db: Database; clock: Clock }) => TDeps` and `createApp: (deps: TDeps) => TApp`. The `client` fixture builds the deps, then the app.
    - `services/example/src/test/test.ts`: pass `createDeps: ({ config, db, clock }) => ({ config, db, clock })` and `createApp: (deps): AppType => createApp(deps)`.
  - **Read first:** [service-api-test](../../../../docs/patterns/service-api-test.md) rule 4.
  - **Tests:** none new; the existing example and harness tests prove nothing changed.
  - **Check:** `vp check`, then the maintainer runs `! vp test services/example packages/service-testing`.

- [x] **2. Define, queue and run jobs in service-runtime**
  - **Goal:** the runtime can define a task, queue it in a transaction, and run it with validation, domain-error handling and job context fields. Nothing uses it yet, so the build stays green.
  - **Files:**
    - `packages/service-runtime/package.json`: add `graphile-worker` `^0.18.0` (already vetted in the lockfile), and run `vp install`.
    - `packages/service-runtime/src/jobs.ts`:
      - `defineTask<TDeps, TSchema extends z.ZodType>(name: string, payloadSchema: TSchema, handler: (deps: TDeps, payload: z.output<TSchema>) => Promise<void>): TaskDefinition<TDeps, z.input<TSchema>>`;
      - `addJob<TPayload>(connection: DatabaseTransactionConnection, task: TaskDefinition<unknown, TPayload>, payload: TPayload): Promise<void>`: it validates the payload with the task's schema, then runs `select graphile_worker.add_job(${name}, ${payload}::json)`;
      - `createTaskList<TDeps>(tasks: readonly TaskDefinition<TDeps, never>[], deps: TDeps): TaskList`: each task runs in `withContextFields`, annotates `jobId`, `taskName` and `attempt` from graphile-worker's helpers, parses the payload, and calls the handler. A `DomainError` is logged with `log.warn({ code }, …)` and the job completes. Any other error is rethrown.
    - `packages/service-runtime/src/index.ts`: export `defineTask`, `addJob`, `createTaskList` and `type TaskDefinition`.
  - **Read first:** [background-job](../../../../docs/patterns/background-job.md), [ADR 0012](../../../../docs/adr/0012-run-background-jobs-with-graphile-worker.md), [ADR 0024](../../../../docs/adr/0024-signal-expected-failures-with-thrown-domain-errors.md), [observability](../../../../docs/patterns/observability.md), and graphile-worker's `add_job`, task helpers and `runOnce` through context7.
  - **Establishes:** [background-job](../../../../docs/patterns/background-job.md) (the runtime half; the job slice is in step 7).
  - **Tests:** in `packages/service-runtime/src/jobs.test.ts`, against a database from `@arcturus/test-database`, running jobs with graphile-worker's `runOnce`:
    - "a job queued in a transaction that commits is queued";
    - "a job queued in a transaction that throws is rolled back with the transaction's rows";
    - "rejects a payload that doesn't match the task's schema when queued";
    - "fails a job whose stored payload doesn't match the task's schema";
    - "logs a domain error as a warning with its code and completes the job";
    - "rethrows any other error so the job is retried";
    - "log lines written by a job carry its job ID, task name and attempt".
  - **Check:** `vp check`, then `! vp test packages/service-runtime/src/jobs.test.ts`.

- [x] **3. Run a worker, check it for readiness and stop it before the pool**
  - **Goal:** a service can start a worker, `/health/ready` answers not-ready when it isn't running, and shutdown stops it before the pool ends. The example service still passes no worker, so its readiness is unchanged.
  - **Files:**
    - `packages/service-runtime/src/jobs.ts`: `interface Worker { isRunning(): boolean; stop(): Promise<void> }`, and `startWorker(options: { connectionString: string; taskList: TaskList }): Promise<Worker>`, which runs graphile-worker's `run` with `noHandleSignals`, a logger adapted to `log`, and `isRunning()` false once the runner's `promise` settles.
    - `packages/service-runtime/src/health.ts`: `health(options: { db?: Database; worker?: Worker })`. Readiness is not-ready when the worker isn't running, logged as a warning, as for the database.
    - `packages/service-runtime/src/service-app.ts`: `createServiceApp(options: { db?: Database; worker?: Worker })` passes both to `health`.
    - `packages/service-runtime/src/index.ts`: export `startWorker` and `type Worker`.
  - **Read first:** [service-composition-root](../../../../docs/patterns/service-composition-root.md), and graphile-worker's `run`, `Runner` and logger through context7.
  - **Tests:**
    - in `packages/service-runtime/src/jobs.test.ts`: "a started worker runs a queued job"; "a worker is running until it is stopped";
    - in `packages/service-runtime/src/service-app.test.ts`: "readiness answers not-ready when the worker isn't running", with a stopped real worker.
  - **Check:** `vp check`, then `! vp test packages/service-runtime`.

- [x] **4. Give API tests runJobs, a test worker and a strict MSW network**
  - **Goal:** the harness has the `runJobs`, `worker` and `network` fixtures that rule 4 lists, and they behave as rules 1 and 11 and the ticket say. No service has tasks or handlers yet, so existing tests pass unchanged.
  - **Files:**
    - `packages/service-testing/package.json`: add `msw` 3.x, after the supply-chain checks, and run `vp install`.
    - `packages/service-testing/src/create-service-test.ts`: new options `createTaskList?: (deps: TDeps) => TaskList` and `handlers?: readonly RequestHandler[]`. `createDeps` also receives `worker`. New fixtures:
      - `network`: one `setupServer(...handlers)` per Vitest worker, listening with `onUnhandledRequest: 'error'`, with its handlers reset after each test;
      - `worker`: a test worker implementing `Worker`, running until its `stop()` is called;
      - `runJobs(options?: { allowFailures?: boolean })`: runs graphile-worker's `runOnce` with the service's task list on the test database's connection string, collects `job:error` events, and throws them all unless `allowFailures` is set.
    - `packages/service-testing/src/test-database.ts` (or where the handle's state lives): keep the test database's connection string for `runJobs`.
    - `packages/service-testing/src/index.ts`: export the new types as needed.
  - **Read first:** [service-api-test](../../../../docs/patterns/service-api-test.md) rules 4, 6, 11 and 17, [service-endpoint-mock](../../../../docs/patterns/service-endpoint-mock.md) rules 1 and 9, [ADR 0033](../../../../docs/adr/0033-fake-outbound-http-in-tests-with-msw.md), [ADR 0020](../../../../docs/adr/0020-guard-the-dependency-supply-chain.md), and MSW's `setupServer` and graphile-worker's `runOnce` and `events` through context7.
  - **Tests:** in `packages/service-testing/src/`, beside `capture-logs.test.ts`, with small apps and tasks built in the test files:
    - `network.test.ts`: "fails an outbound request that no handler matches"; "answers through a default handler"; "a handler a test installs is gone in the next test";
    - `run-jobs.test.ts`: "runs queued jobs until none can run"; "fails the test when a job throws anything other than a domain error"; "with allowFailures, leaves the failed job to retry"; "a domain error doesn't fail the test".
  - **Check:** `vp check`, then `! vp test packages/service-testing`.

- [ ] **5. Add the delivered time and the inbox table**
  - **Goal:** migration 000002 adds `messages.delivered_at` and `inbox_messages`, committed with a regenerated `schema.sql`. No code reads them yet.
  - **Files:**
    - `services/example/migrations/current.sql`, then committed as `services/example/migrations/committed/000002-…sql`: `alter table messages add column if not exists delivered_at timestamptz` (null until delivered), and `create table inbox_messages (message_id uuid primary key, body text not null, received_at timestamptz not null)`, with comments and an undo, as the pattern says.
    - The regenerated schema dump.
  - **Read first:** [database-migration](../../../../docs/patterns/database-migration.md).
  - **Tests:** none; the template build in every later test runs the migration.
  - **Check:** the maintainer runs `vp run infra:up`, then the example service's `db:watch` until the schema is right, then `db:commit`; then `vp run lint:sql`.

- [ ] **6. Receive messages idempotently in the inbox**
  - **Goal:** `POST /inbox/receive-message` stores a message keyed on its ID, a duplicate is a 204 no-op, and `GET /inbox/list-received-messages` lists what was stored.
  - **Files:**
    - `services/example/src/inbox/receive-message/` (`route.ts`, `schemas.ts`, `handler.ts`, `queries.ts`): `receiveMessageInput = z.object({ messageId: z.uuid(), body: z.string().min(1) })`, answering 204. `insertReceivedMessage` runs `insert into inbox_messages … on conflict (message_id) do nothing`, with `received_at` from the clock.
    - `services/example/src/inbox/list-received-messages/` (`route.ts`, `schemas.ts`, `handler.ts`, `queries.ts`): answers `{ messages: { messageId, body, receivedAt }[] }`, ordered by `received_at`, then `message_id`.
    - `services/example/src/inbox/router.ts`, and `services/example/src/app.ts` mounting it at `/inbox`.
    - `services/example/src/test/factories/receive-message-input.factory.ts`.
  - **Read first:** [idempotent-receiver](../../../../docs/patterns/idempotent-receiver.md), [vertical-slice](../../../../docs/patterns/vertical-slice.md), [database-transaction](../../../../docs/patterns/database-transaction.md), [service-test-data](../../../../docs/patterns/service-test-data.md).
  - **Establishes:** [idempotent-receiver](../../../../docs/patterns/idempotent-receiver.md).
  - **Tests:**
    - in `services/example/src/inbox/receive-message/receive-message.test.ts`: "answers 204 and stores the message"; "answers 204 to a repeated message and stores it once"; "answers 400 problem details for a message ID that isn't a UUID";
    - in `services/example/src/inbox/list-received-messages/list-received-messages.test.ts`: "lists no messages before any are received"; "lists received messages in the order they arrived".
  - **Check:** `vp check`, then `! vp test services/example/src/inbox`.

- [ ] **7. Deliver each sent message with a job**
  - **Goal:** sending a message queues a delivery job in its transaction. The job posts the message to `DELIVERY_URL` through the inbox client, outside any transaction, then records when it was delivered. Get-message shows `deliveredAt`, and `main.ts` runs the worker.
  - **Files:**
    - `services/example/package.json`: add `msw` (the same version as step 4) as a devDependency, and run `vp install`.
    - `services/example/src/config.ts`: `DELIVERY_URL: z.url()`, read into `config.delivery.url`.
    - `services/example/src/clients/inbox/inbox.ts`: `receiveMessageRequest` (its own zod schema, `{ messageId, body }`), `interface InboxClient { receiveMessage(request: ReceiveMessageRequest): Promise<void> }`, and `createInboxClient(options: { url: string }): InboxClient`, which posts with `fetch`. A 4xx throws `RuleViolationError("delivery-rejected", …)`, and a 5xx or a network failure throws a plain `Error`.
    - `services/example/src/clients/inbox/inbox.handlers.ts`: `receiveMessageHandler` (the default, matching `*/inbox/receive-message` and answering 204), `inboxHandlers`, and `mockReceiveMessage(response?)`, which returns `{ requests: ReceiveMessageRequest[] }`.
    - `services/example/src/messaging/deliver-message/` (`task.ts`, `schemas.ts`, `handler.ts`, `queries.ts`): `deliverMessagePayload = z.object({ messageId: z.uuid() })`, and `deliverMessageTask = defineTask("messaging.deliver-message", …)`. The handler annotates `messageId`, reads the message with `db.read`, throws `NotFoundError("message-not-found", …)` if it's missing, returns if it's already delivered, calls `deps.inbox.receiveMessage`, then runs `markDelivered` (`update messages set delivered_at = … where id = … and delivered_at is null`) in `db.transaction`, and logs that the message was delivered.
    - `services/example/src/tasks.ts`: the task registry, `tasks = [deliverMessageTask]`.
    - `services/example/src/messaging/send-message/handler.ts`: `addJob(connection, deliverMessageTask, { messageId: id })` after `insertMessage`, in the same transaction.
    - `services/example/src/messaging/get-message/` (`queries.ts`, `schemas.ts`, `handler.ts`): `deliveredAt: z.iso.datetime().nullable()` in the output, read from `delivered_at`.
    - `services/example/src/app.ts`: `Deps` gains `inbox: InboxClient` and `worker: Worker`, and `createServiceApp({ db, worker })`.
    - `services/example/src/main.ts`: build the inbox client, start the worker with `createTaskList(tasks, deps)` on `config.database.connectionString`, and in `onClose` stop the worker before closing the pool.
    - `services/example/src/test/test.ts`: `DELIVERY_URL: "http://inbox.test/inbox/receive-message"` in `testConfig`, the inbox client in `createDeps`, `createTaskList: (deps) => createTaskList(tasks, deps)`, and `handlers: inboxHandlers`.
    - `services/example/src/test/direct-db.ts`: `queueDeliverMessage(db, payload)`, the only way a test queues a repeated job.
    - `services/example/src/test/factories/`: a factory for the inbox's 204 and problem-details responses, if the handlers need one.
  - **Read first:** [background-job](../../../../docs/patterns/background-job.md), [service-endpoint-mock](../../../../docs/patterns/service-endpoint-mock.md), [idempotent-receiver](../../../../docs/patterns/idempotent-receiver.md) rule 4 and the job half of its "When to use it", [database-transaction](../../../../docs/patterns/database-transaction.md), [service-composition-root](../../../../docs/patterns/service-composition-root.md), [error-handling](../../../../docs/patterns/error-handling.md), [service-api-test](../../../../docs/patterns/service-api-test.md) rules 11, 13 and 19, and MSW's `http`, `HttpResponse` and `server.use` through context7.
  - **Establishes:** [background-job](../../../../docs/patterns/background-job.md) (the job slice and the task registry), [service-endpoint-mock](../../../../docs/patterns/service-endpoint-mock.md).
  - **Tests:**
    - in `services/example/src/messaging/deliver-message/deliver-message.test.ts`:
      - "delivers a sent message to the inbox once";
      - "a repeated delivery job for a delivered message sends nothing";
      - "a rejected delivery completes without retrying" (the inbox answers 422; the message stays undelivered and the recorder holds one request);
      - "logs a rejected delivery as a warning with its code", with `captureLogs`, apart from the others (rule 19);
      - "a failed delivery fails runJobs";
      - "with allowFailures, a failed delivery is left to retry" (the inbox answers 500; the message stays undelivered);
      - "log lines written by the job carry its job ID, task name and attempt", with `captureLogs`;
    - in `services/example/src/messaging/get-message/get-message.test.ts`: update the existing body assertions for `deliveredAt`, and add "shows a delivered message's delivery time";
    - in `services/example/src/health-ready.test.ts`: "answers not-ready when the worker has stopped".
  - **Check:** `vp check`, then `! vp test services/example`.

- [ ] **8. Document jobs, endpoint mocks and the inbox**
  - **Goal:** the patterns name the example service's code as exemplars and match the API as built, and the READMEs and the maintainer's `.env.development` key are in place.
  - **Files:**
    - `docs/patterns/background-job.md`: exemplar (`services/example/src/messaging/deliver-message/`, `src/tasks.ts`, and the `addJob` call in send-message); rule 5 reworded to `addJob(connection, task, payload)`, taking the task definition.
    - `docs/patterns/service-endpoint-mock.md`: exemplar (`services/example/src/clients/inbox/inbox.handlers.ts` and the deliver-message tests).
    - `docs/patterns/idempotent-receiver.md`: exemplar (`services/example/src/inbox/receive-message/`, and the delivery job's delivered check).
    - `docs/patterns/service-api-test.md`: rule 4's `createServiceTest` options (`createDeps`, `createApp(deps)`, `createTaskList`, `handlers`) and the `worker` fixture; rule 11 gains a sentence giving its reasoning (from the planning decisions).
    - `docs/patterns/service-composition-root.md`, if its rules or exemplar name the deps or shutdown order that changed.
    - `packages/service-runtime/README.md`, `packages/service-testing/README.md` and `services/example/README.md`: what each now holds, the inbox endpoints, and `DELIVERY_URL`.
    - Tell the maintainer to add `DELIVERY_URL=http://localhost:3900/inbox/receive-message` to `services/example/.env.development`, which Claude can't read.
  - **Read first:** the `writing-docs` skill and the `pattern` skill (exemplars).
  - **Tests:** none.
  - **Check:** `vp check`.

**9. Acceptance criteria**, checked at the test boundary:

- [ ] After sending a message and running jobs, the delivery endpoint has received it exactly once, and getting the message shows it as delivered: proven by "delivers a sent message to the inbox once" in `services/example/src/messaging/deliver-message/deliver-message.test.ts`
- [ ] A send that fails after queuing leaves neither a message nor a job, which proves `addJob` commits and rolls back with the Slonik transaction: proven by "a job queued in a transaction that throws is rolled back with the transaction's rows" in `packages/service-runtime/src/jobs.test.ts`
- [ ] Running the delivery job again for a delivered message sends nothing: proven by "a repeated delivery job for a delivered message sends nothing" in `services/example/src/messaging/deliver-message/deliver-message.test.ts`
- [ ] Posting the same message to the inbox twice answers success both times and stores it once: proven by "answers 204 to a repeated message and stores it once" in `services/example/src/inbox/receive-message/receive-message.test.ts`
- [ ] A payload that doesn't match the task's schema is rejected when queued: proven by "rejects a payload that doesn't match the task's schema when queued" in `packages/service-runtime/src/jobs.test.ts`
- [ ] A domain error thrown by a job is logged as a warning with its code, and the job doesn't run again, asserted with `captureLogs`: proven by "logs a rejected delivery as a warning with its code" and "a rejected delivery completes without retrying" in `services/example/src/messaging/deliver-message/deliver-message.test.ts`
- [ ] A job that throws an unexpected error fails the test through `runJobs()`; with `{ allowFailures: true }` it doesn't, and the job is left to retry: proven by "a failed delivery fails runJobs" and "with allowFailures, a failed delivery is left to retry" in `services/example/src/messaging/deliver-message/deliver-message.test.ts`, and the `run-jobs.test.ts` tests in `packages/service-testing/src/`
- [ ] Log lines written by a job carry its job ID, task name and attempt: proven by "log lines written by the job carry its job ID, task name and attempt" in `services/example/src/messaging/deliver-message/deliver-message.test.ts`
- [ ] `/health/ready` answers not-ready when the worker isn't running: proven by "answers not-ready when the worker has stopped" in `services/example/src/health-ready.test.ts`, and "ready answers not-ready when the worker isn't running" in `packages/service-runtime/src/service-app.test.ts`
- [ ] An unhandled outbound request fails the test, because MSW is strict: proven by "fails an outbound request that no handler matches" in `packages/service-testing/src/network.test.ts`
- [ ] The exemplars of these patterns name the example service's code: background jobs, service endpoint mocks and idempotent receivers: proven by step 8's edits to `docs/patterns/background-job.md`, `service-endpoint-mock.md` and `idempotent-receiver.md`

## Notes

- 2026-11-27: MSW 3 renamed `onUnhandledRequest` to `onUnhandledFrame` (`server.listen({ onUnhandledFrame: "error" })`). Step 8 updates service-endpoint-mock rule 1 and ADR 0033's wording to match. MSW 3 also exports `http` and `HttpResponse` from `msw`, and `AnyHandler` is the handler type.
- 2026-11-27: The harness's fixtures, as built in step 4: `mswServer` (file-scoped, automatic), `network` (automatic, resets handlers after each test), `worker` (the test worker), `deps` (from `createDeps`, shared by `client` and `runJobs`), `client`, `runJobs` and `captureLogs`. `createDeps` receives `worker` too. Step 8's rule 4 update lists them.
- 2026-11-27: `packages/service-testing/src/run-jobs.test.ts` uses the example service's template (`database: "example"`), because only services have migrated templates. When the example service is deleted, point it at a real service's template.
- 2026-11-27: `service-runtime` exports `workerLogger` and the `TaskList` type, so the harness's `runJobs` logs as the worker does.
- 2026-11-27: `pnpm-workspace.yaml` overrides `"@vitest/mocker>msw:peer": "-"`: that optional peer gave every package depending on msw its own Vitest copy, so its `test` couldn't find the runner's suite. Browser mode's module mocking uses an RPC and import-map interceptor, not msw, so frontend browser-mode tests are unaffected; revisit if a Vitest upgrade changes that.
