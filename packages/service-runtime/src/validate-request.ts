import { zValidator } from "@hono/zod-validator";
import type { ValidationTargets } from "hono";
import type { z } from "zod";

import type { ProblemIssue } from "./problem-details.ts";

/** Thrown by `validateRequest`, so the error handler answers 400. Services never throw it. */
export class RequestValidationError extends Error {
  readonly issues: ProblemIssue[];

  constructor(issues: ProblemIssue[]) {
    super("The request is not valid.");
    this.name = "RequestValidationError";
    this.issues = issues;
  }
}

const toIssue = (issue: z.core.$ZodIssue): ProblemIssue => ({
  path: issue.path.map(String).join("."),
  code: issue.code,
  message: issue.message,
});

/** `zValidator`, answering a failure with problem details (error-handling rule 7). */
export const validateRequest = <T extends z.ZodType, Target extends keyof ValidationTargets>(
  target: Target,
  schema: T,
  // oxlint-disable-next-line typescript/explicit-module-boundary-types -- the middleware type carries the parsed input, inferred so c.req.valid() and the RPC client follow it
) =>
  zValidator(target, schema, (result) => {
    if (!result.success) {
      throw new RequestValidationError(result.error.issues.map(toIssue));
    }
  });
