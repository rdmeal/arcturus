import type { AnyHandler } from "msw";
import { setupServer } from "msw/node";

export type { AnyHandler } from "msw";

/** The MSW server behind the `network` fixture. */
export type Network = ReturnType<typeof setupServer>;

/**
 * An MSW server answering with `handlers`, which fails any request no handler
 * matches (docs/adr/0033-fake-outbound-http-in-tests-with-msw.md).
 */
export const startNetwork = (handlers: readonly AnyHandler[]): Network => {
  const network = setupServer(...handlers);
  network.listen({ onUnhandledFrame: "error" });
  return network;
};
