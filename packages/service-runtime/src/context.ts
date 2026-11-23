import { context, createContextKey } from "@opentelemetry/api";
import { AsyncLocalStorageContextManager } from "@opentelemetry/context-async-hooks";

export type ContextFields = Record<string, string | number | boolean>;

// Without a context manager, OTel's API drops the context across `await`.
// The SDK, loaded first through `--import`, registers its own, so this one
// only takes effect when the SDK isn't running, as in tests.
const contextManager = new AsyncLocalStorageContextManager();
if (context.setGlobalContextManager(contextManager)) {
  contextManager.enable();
}

// OTel contexts are immutable, so a scope holds one mutable object that
// `annotate` adds to, and every later context in the scope shares it.
class Scope {
  readonly fields: ContextFields = {};
}

const scopeKey = createContextKey("arcturus.context-scope");

const scopeFields = (): ContextFields | undefined => {
  const scope = context.active().getValue(scopeKey);
  return scope instanceof Scope ? scope.fields : undefined;
};

/** Adds fields to every later log line of the current request or job. Outside one, it does nothing. */
export const annotate = (fields: ContextFields): void => {
  const current = scopeFields();
  if (current !== undefined) {
    Object.assign(current, fields);
  }
};

export const withContextFields = <T>(fn: () => T): T =>
  context.with(context.active().setValue(scopeKey, new Scope()), fn);

export const currentContextFields = (): ContextFields => ({ ...scopeFields() });
