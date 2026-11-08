import type { Stamp } from 'pinpoint-core'
import { persistentStore, useStore } from '../lib/store.ts'

/** The player's stamps. Photos are kept separately in IndexedDB. */
export const progressStore = persistentStore<Stamp[]>('pinpoint.stamps.v1', [], (stored) =>
  Array.isArray(stored) ? (stored as Stamp[]) : [],
)

export const useStamps = () => useStore(progressStore)

export function addStamp(stamp: Stamp) {
  progressStore.set((all) =>
    all.some((s) => s.questId === stamp.questId && s.pinId === stamp.pinId) ? all : [...all, stamp],
  )
}

export function patchStamp(questId: string, pinId: string, patch: Partial<Stamp>) {
  progressStore.set((all) => all.map((s) => (s.questId === questId && s.pinId === pinId ? { ...s, ...patch } : s)))
}

export function findStamp(stamps: Stamp[], questId: string, pinId: string) {
  return stamps.find((s) => s.questId === questId && s.pinId === pinId)
}

export function stampedPins(stamps: Stamp[], questId: string): Set<string> {
  return new Set(stamps.filter((s) => s.questId === questId).map((s) => s.pinId))
}

export function resetProgress() {
  progressStore.set([])
}
