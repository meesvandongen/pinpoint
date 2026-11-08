import type { Position } from 'pinpoint-core'

/** Millimetres of rain in the last hour that count as rain. */
const RAIN_THRESHOLD = 0.1

export const WEATHER_ENDPOINT = 'https://api.open-meteo.com/v1/forecast'

/**
 * Whether it is raining at a position, from Open-Meteo. The position is rounded to about a
 * kilometre first. Returns `undefined` when the lookup fails, so a bad connection never blocks a stamp.
 */
export async function isRaining(position: Position, signal?: AbortSignal): Promise<boolean | undefined> {
  const url = new URL(WEATHER_ENDPOINT)
  url.searchParams.set('latitude', position.lat.toFixed(2))
  url.searchParams.set('longitude', position.lng.toFixed(2))
  url.searchParams.set('current', 'precipitation')
  try {
    const timeout = AbortSignal.timeout(6000)
    const res = await fetch(url, { signal: signal ? AbortSignal.any([signal, timeout]) : timeout })
    if (!res.ok) return undefined
    const body = (await res.json()) as { current?: { precipitation?: unknown } }
    const mm = body.current?.precipitation
    return typeof mm === 'number' ? mm >= RAIN_THRESHOLD : undefined
  } catch {
    return undefined
  }
}
