/** Where code reads the current time, so tests can fix it. */
export interface Clock {
  readonly now: () => Date;
}

export const systemClock: Clock = Object.freeze({ now: () => new Date() });
