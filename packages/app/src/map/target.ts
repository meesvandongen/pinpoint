import { circleRing, roughArea, type Pin, type Position } from 'pinpoint-core'

/** What a map clue draws: the exact pin with its arrival radius, or a loose area that hides the exact spot. */
export type MapTarget = { mode: 'pin' | 'area'; center: Position; radius: number }

export function mapTarget(pin: Pick<Pin, 'id' | 'position' | 'radius'>, view: 'full' | 'area'): MapTarget {
  if (view === 'area') return { mode: 'area', ...roughArea(pin) }
  return { mode: 'pin', center: pin.position, radius: pin.radius }
}

/** Points that have to be on screen: the whole target circle, and the player when known. */
export function framePoints(target: MapTarget, you?: Position): Position[] {
  return [...circleRing(target.center, Math.max(target.radius, 25), 12), ...(you ? [you] : [])]
}

export function webglSupported(): boolean {
  try {
    const canvas = document.createElement('canvas')
    return !!(canvas.getContext('webgl2') ?? canvas.getContext('webgl'))
  } catch {
    return false
  }
}
