import type { Context, ErrorHandler } from "hono";
import type { ApplyGlobalResponse } from "hono/client";

import { ConflictError, DomainError, NotFoundError, RuleViolationError } from "./domain-error.ts";
import { log } from "./log.ts";

/** One field that failed validation, with zod's issue code for the client to translate. */
export interface ProblemIssue {
  path: string;
  code: string;
  message: string;
}

/**
 * An RFC 9457 error body. Clients translate `code`; `title` and `detail` are
 * English fallbacks (docs/patterns/error-handling.md).
 */
export interface ProblemDetails {
  type: "about:blank";
  title: string;
  status: number;
  detail: string;
  code: string;
  issues?: ProblemIssue[];
}

const badRequest = 400;
const notFound = 404;
const conflict = 409;
const unprocessableContent = 422;
const internalServerError = 500;

type ProblemStatus =
  | typeof badRequest
  | typeof notFound
  | typeof conflict
  | typeof unprocessableContent
  | typeof internalServerError;

const titles: Record<ProblemStatus, string> = {
  [badRequest]: "Bad Request",
  [notFound]: "Not Found",
  [conflict]: "Conflict",
  [unprocessableContent]: "Unprocessable Content",
  [internalServerError]: "Internal Server Error",
};

/** A service's `AppType`, with the problem-details body on every route for the RPC client. */
export type WithProblemDetails<App> = ApplyGlobalResponse<
  App,
  { [S in ProblemStatus]: { json: ProblemDetails } }
>;

// The one category-to-status mapping (error-handling rule 4). A category a
// service defines itself has no status, so it answers 500 and is logged.
const domainErrorStatus = (error: DomainError): ProblemStatus | undefined => {
  if (error instanceof NotFoundError) {
    return notFound;
  }
  if (error instanceof ConflictError) {
    return conflict;
  }
  if (error instanceof RuleViolationError) {
    return unprocessableContent;
  }
  return undefined;
};

const problem = (
  c: Context,
  status: ProblemStatus,
  details: Pick<ProblemDetails, "detail" | "code" | "issues">,
): Response => {
  const body: ProblemDetails = { type: "about:blank", title: titles[status], status, ...details };
  return c.json(body, status, { "Content-Type": "application/problem+json" });
};

/** Installed by `createServiceApp`; services never call `onError` themselves. */
export const errorHandler: ErrorHandler = (error, c) => {
  if (error instanceof DomainError) {
    const status = domainErrorStatus(error);
    if (status !== undefined) {
      // A domain error is a normal response (observability rule 4).
      log.debug({ code: error.code, status }, "domain error answered");
      return problem(c, status, { detail: error.message, code: error.code });
    }
  }
  log.error({ err: error }, "unexpected error");
  return problem(c, internalServerError, {
    detail: "An unexpected error occurred.",
    code: "internal-error",
  });
};
