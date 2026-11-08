import { createStore, useStore } from './store.ts'

/**
 * The time the game sees. It is the real time unless the test tools move it, which is how a tester
 * checks the "after dark" and "sunrise" marks at noon.
 */
export type ClockState = {
  /** A fixed moment in milliseconds since the epoch, or `undefined` for real time. */
  fixed?: number
  /** Seconds added to every clue timer, so a tester can skip the waiting. */
  skipSeconds: number
}

export const clockStore = createStore<ClockState>({ skipSeconds: 0 })

export function now(): Date {
  const { fixed } = clockStore.get()
  return new Date(fixed ?? Date.now())
}

export function useSkipSeconds(): number {
  return useStore(clockStore, (c) => c.skipSeconds)
}
