import { skyAt, type Position, type Sky } from 'pinpoint-core'

/**
 * A moment of the local day when the sky is what the tester asks for: the middle of the first
 * stretch of the day that has it. Scans in five-minute steps from midnight.
 */
export function momentWithSky(day: Date, position: Position, sky: Sky): Date | undefined {
  const start = new Date(day)
  start.setHours(0, 0, 0, 0)
  const hits: number[] = []
  for (let minutes = 0; minutes < 24 * 60; minutes += 5) {
    const moment = new Date(start.getTime() + minutes * 60_000)
    if (skyAt(moment, position) === sky) hits.push(moment.getTime())
  }
  if (hits.length === 0) return undefined
  // The first run of consecutive hits: its middle is safely inside the window.
  let end = 0
  while (end + 1 < hits.length && hits[end + 1] - hits[end] === 5 * 60_000) end++
  return new Date(hits[Math.floor(end / 2)])
}
