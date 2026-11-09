import { createStore, useStore } from '../lib/store.ts'

/**
 * The pin whose stamp is still to be pressed on the quest page: set when the player finishes the pages after
 * check-in, cleared once the quest page has played the stamp, the stars and the photo onto it. Kept in memory
 * only, and it goes stale after a few seconds, so a reload or a later visit shows the page as it is.
 */
export type Landing = { questId: string; pinId: string; at: number }

/** A landing older than this is not played any more. */
export const LANDING_TTL_MS = 5000

export const landingStore = createStore<Landing | undefined>(undefined)

export const useLanding = () => useStore(landingStore)

export function land(questId: string, pinId: string) {
  landingStore.set({ questId, pinId, at: Date.now() })
}

export function landed() {
  landingStore.set(undefined)
}
