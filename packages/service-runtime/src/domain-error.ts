/**
 * An expected failure, thrown with a stable kebab-case `code` the client can
 * translate, and a message written for the client. Throw one of the
 * categories, never this class itself (docs/patterns/error-handling.md).
 */
// oxlint-disable-next-line max-classes-per-file -- the categories are one small family, read together with their base
export abstract class DomainError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = new.target.name;
    this.code = code;
  }
}

/** The thing the request refers to doesn't exist, or the caller may not see it. */
export class NotFoundError extends DomainError {}

/** The current state doesn't allow the operation. */
export class ConflictError extends DomainError {}

/** The input is well formed but breaks a rule. */
export class RuleViolationError extends DomainError {}
