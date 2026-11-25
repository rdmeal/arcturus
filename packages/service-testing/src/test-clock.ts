import type { Clock } from "@arcturus/service-runtime";

/** The `clock` fixture's value: a clock that moves only when a test moves it. */
export interface TestClock extends Clock {
  readonly set: (instant: Date | string) => void;
  readonly advance: (milliseconds: number) => void;
}

// Far from real time, so any accidental use of the system clock shows.
const start = "2030-01-01T00:00:00Z";

export const createTestClock = (): TestClock => {
  let current = new Date(start);
  return Object.freeze({
    now: () => new Date(current),
    set: (instant: Date | string) => {
      current = new Date(instant);
    },
    advance: (milliseconds: number) => {
      current = new Date(current.getTime() + milliseconds);
    },
  });
};
