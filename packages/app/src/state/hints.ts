import { useMemo } from 'react'
import { persistentStore, useStore } from '../lib/store.ts'

/**
 * The hints a player asked for, per pin, kept on the device. Leaving a pin and coming back must not take
 * them away, or hand the points back: a hint you have seen is a hint you have used.
 */
type Asked = Record<string, number[]>

export const hintsStore = persistentStore<Asked>('pinpoint.hints.v1', {}, (stored) =>
  typeof stored === 'object' && stored !== null && !Array.isArray(stored) ? (stored as Asked) : {},
)

const keyOf = (questId: string, pinId: string) => `${questId}/${pinId}`
const NONE: number[] = []

/** The indexes of the clues of this pin the player has asked for. */
export function useAskedHints(questId: string, pinId: string): ReadonlySet<number> {
  const asked = useStore(hintsStore, (all) => all[keyOf(questId, pinId)] ?? NONE)
  return useMemo(() => new Set(asked), [asked])
}

export function askForHint(questId: string, pinId: string, index: number) {
  const key = keyOf(questId, pinId)
  hintsStore.set((all) => (all[key]?.includes(index) ? all : { ...all, [key]: [...(all[key] ?? []), index] }))
}

export function resetHints() {
  hintsStore.set({})
}
