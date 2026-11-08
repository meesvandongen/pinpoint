import { persistentStore, useStore } from '../lib/store.ts'

export type Settings = {
  /** `auto` follows the device. */
  language: 'auto' | 'en' | 'nl'
  /** Hides distance, direction and map for players who know the city. */
  expert: boolean
  /** Look up the weather at arrival (sends the position to Open-Meteo) to earn the rain mark. */
  weatherMarks: boolean
}

const defaults: Settings = { language: 'auto', expert: false, weatherMarks: false }

export const settingsStore = persistentStore<Settings>('pinpoint.settings.v1', defaults, (stored) => ({
  ...defaults,
  ...(typeof stored === 'object' && stored !== null ? (stored as Partial<Settings>) : {}),
}))

export const useSettings = () => useStore(settingsStore)

export function updateSettings(patch: Partial<Settings>) {
  settingsStore.set((current) => ({ ...current, ...patch }))
}
