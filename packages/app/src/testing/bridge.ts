import type { QueryClient } from '@tanstack/react-query'
import type { MockRepository } from 'gitvfs-github-msw'
import { createStore, useStore } from '../lib/store.ts'

export type MockWeather = 'real' | 'dry' | 'rain'

export type MockedRequest = { method: string; url: string; at: number }

/** What the test tools remember between panels. */
export const testState = createStore<{ weather: MockWeather; requests: MockedRequest[] }>({ weather: 'real', requests: [] })
export const useTestState = () => useStore(testState)

export function logRequest(entry: MockedRequest) {
  testState.set((s) => ({ ...s, requests: [entry, ...s.requests].slice(0, 30) }))
}

/** Handles the setup step gives to the panels. */
export const bridge = createStore<{
  queryClient?: QueryClient
  repository?: MockRepository
  resetRepository?: () => Promise<void>
}>({})
export const useBridge = () => useStore(bridge)
