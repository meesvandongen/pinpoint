import type { Fix } from 'pinpoint-core'
import { createStore, useStore } from '../lib/store.ts'

export type LocationState = {
  /** `idle` until the player agrees to share a position. */
  status: 'idle' | 'watching' | 'denied' | 'unavailable'
  /** The device position. */
  device?: Fix
  /** A position set by the test tools. While it is set it replaces the device position. */
  simulated?: Fix
  error?: string
}

export const locationStore = createStore<LocationState>({ status: 'idle' })

/** The position the game uses: the simulated one when the test tools set it. */
export function currentFix(state: LocationState = locationStore.get()): Fix | undefined {
  return state.simulated ?? state.device
}

export const useFix = () => useStore(locationStore, currentFix)
export const useLocationState = () => useStore(locationStore)

export function setSimulatedFix(fix: Fix | undefined) {
  locationStore.set((s) => ({ ...s, simulated: fix }))
}

let watchId: number | undefined

/** Starts reading the device position. Call it from a tap, so the permission prompt has a reason. */
export function startWatching() {
  if (watchId !== undefined) return
  if (!('geolocation' in navigator)) {
    locationStore.set((s) => ({ ...s, status: 'unavailable', error: 'This device cannot share its location.' }))
    return
  }
  locationStore.set((s) => ({ ...s, status: 'watching', error: undefined }))
  watchId = navigator.geolocation.watchPosition(
    (p) =>
      locationStore.set((s) => ({
        ...s,
        status: 'watching',
        error: undefined,
        device: { lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy },
      })),
    (e) => {
      const denied = e.code === e.PERMISSION_DENIED
      if (denied) stopWatching()
      locationStore.set((s) => ({ ...s, status: denied ? 'denied' : s.status, error: e.message }))
    },
    { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
  )
}

export function stopWatching() {
  if (watchId !== undefined) navigator.geolocation.clearWatch(watchId)
  watchId = undefined
}

/** True once there is a position to work with, from the device or the test tools. */
export const hasPosition = (state: LocationState) => currentFix(state) !== undefined
