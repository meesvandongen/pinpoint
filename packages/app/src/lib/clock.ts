import { createStore } from './store.ts'

/**
 * The time the game sees. It is the real time unless the test tools move it, which is how a tester
 * checks the "after dark" and "sunrise" marks at noon.
 */
export type ClockState = {
  /** A fixed moment in milliseconds since the epoch, or `undefined` for real time. */
  fixed?: number
}

export const clockStore = createStore<ClockState>({})

export function now(): Date {
  const { fixed } = clockStore.get()
  return new Date(fixed ?? Date.now())
}
