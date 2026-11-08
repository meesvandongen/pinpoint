import type { Pin, Quest } from 'pinpoint-core'
import { createStore } from '../lib/store.ts'

/**
 * What the player is looking at right now, for the test tools: which pins to jump to, and which
 * pin to walk towards. The play screen sets it; nothing in the game itself reads it.
 */
export type PlayContext = { quest?: Quest; pin?: Pin }

export const playContext = createStore<PlayContext>({})
