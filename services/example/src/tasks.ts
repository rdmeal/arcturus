import { deliverMessageTask } from "./messaging/deliver-message/task.ts";

/** Every task the service's worker runs (docs/patterns/background-job.md rule 4). */
export const tasks = [deliverMessageTask];
