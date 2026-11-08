import { useEffect, useState } from 'react'
import type { Fix } from 'pinpoint-core'

/** Reads `?sim=lat,lng[,accuracy]` so the game can be tried without walking. */
export function simFromUrl(): Fix | undefined {
  const raw = new URLSearchParams(location.search).get('sim')
  if (!raw) return undefined
  const [lat, lng, accuracy] = raw.split(',').map(Number)
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng, accuracy: accuracy || 10 } : undefined
}

export type FixState = {
  fix?: Fix
  error?: string
  /** True once the player agreed to share their location (or a simulated one is set). */
  active: boolean
  start(): void
  /** Replaces the real position, for the debug panel. */
  simulate(fix: Fix): void
}

/** Watches the device position, only after `start()` so the permission prompt follows a tap. */
export function useFix(): FixState {
  const [sim, setSim] = useState<Fix | undefined>(simFromUrl)
  const [started, setStarted] = useState(false)
  const [fix, setFix] = useState<Fix>()
  const [error, setError] = useState<string>()

  useEffect(() => {
    if (!started || sim) return
    if (!('geolocation' in navigator)) {
      setError('This device cannot share its location.')
      return
    }
    const id = navigator.geolocation.watchPosition(
      (p) => {
        setError(undefined)
        setFix({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy })
      },
      (e) => setError(e.code === e.PERMISSION_DENIED ? 'Location is switched off for this site.' : e.message),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
    )
    return () => navigator.geolocation.clearWatch(id)
  }, [started, sim])

  return {
    fix: sim ?? fix,
    error,
    active: started || sim !== undefined,
    start: () => setStarted(true),
    simulate: setSim,
  }
}
