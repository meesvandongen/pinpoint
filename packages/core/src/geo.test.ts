import {
  bearingDegrees,
  boundingRing,
  bounds,
  cardinal,
  circleRing,
  destinationPoint,
  distanceMeters,
  moveToward,
  pointInRing,
  questArea,
  ringArea,
  ringsOverlap,
} from './geo.ts'
import type { Ring } from './schema.ts'

const square = (w: number, s: number, e: number, n: number): Ring => [
  { lat: s, lng: w },
  { lat: s, lng: e },
  { lat: n, lng: e },
  { lat: n, lng: w },
]

describe('distance and bearing', () => {
  it('measures a known distance', () => {
    // One degree of latitude is about 111.2 km.
    const d = distanceMeters({ lat: 51, lng: 5 }, { lat: 52, lng: 5 })
    expect(d).toBeGreaterThan(111_000)
    expect(d).toBeLessThan(111_400)
  })
  it('is zero for the same point', () => {
    expect(distanceMeters({ lat: 51.5, lng: 5 }, { lat: 51.5, lng: 5 })).toBe(0)
  })
  it('points north, east, south and west', () => {
    const o = { lat: 51.5, lng: 5 }
    expect(bearingDegrees(o, { lat: 51.6, lng: 5 })).toBeCloseTo(0, 3)
    expect(bearingDegrees(o, { lat: 51.5, lng: 5.1 })).toBeCloseTo(90, 0)
    expect(bearingDegrees(o, { lat: 51.4, lng: 5 })).toBeCloseTo(180, 3)
    expect(bearingDegrees(o, { lat: 51.5, lng: 4.9 })).toBeCloseTo(270, 0)
  })
  it('names the eight compass points', () => {
    expect(cardinal(0)).toBe('N')
    expect(cardinal(44)).toBe('NE')
    expect(cardinal(181)).toBe('S')
    expect(cardinal(359)).toBe('N')
    expect(cardinal(-90)).toBe('W')
  })
})

describe('moving on the globe', () => {
  const o = { lat: 51.56, lng: 5.08 }
  it('finds the point a distance away and round-trips with distance and bearing', () => {
    const p = destinationPoint(o, 240, 30)
    expect(distanceMeters(o, p)).toBeCloseTo(240, 0)
    expect(bearingDegrees(o, p)).toBeCloseTo(30, 1)
  })
  it('moves towards a target and stops on it', () => {
    const target = destinationPoint(o, 100, 90)
    const step = moveToward(o, target, 30)
    expect(distanceMeters(o, step)).toBeCloseTo(30, 0)
    expect(distanceMeters(step, target)).toBeCloseTo(70, 0)
    expect(moveToward(o, target, 500)).toEqual(target)
  })
  it('draws a circle of the right radius', () => {
    const ring = circleRing(o, 220, 36)
    expect(ring).toHaveLength(36)
    for (const p of ring) expect(distanceMeters(o, p)).toBeCloseTo(220, 0)
    expect(pointInRing(o, ring)).toBe(true)
  })
})

describe('rings', () => {
  const tilburg = square(5.02, 51.52, 5.14, 51.6)
  it('finds points inside and outside', () => {
    expect(pointInRing({ lat: 51.56, lng: 5.08 }, tilburg)).toBe(true)
    expect(pointInRing({ lat: 51.7, lng: 5.08 }, tilburg)).toBe(false)
  })
  it('orders nested areas by size', () => {
    const country = square(3.35, 50.75, 7.23, 53.55)
    expect(ringArea(country)).toBeGreaterThan(ringArea(tilburg))
    // 0.12 degrees of longitude by 0.08 of latitude near 51.5 N, roughly 8.3 km by 8.9 km.
    expect(ringArea(tilburg)).toBeGreaterThan(60e6)
    expect(ringArea(tilburg)).toBeLessThan(90e6)
  })
  it('detects overlap by containment, crossing edges and separation', () => {
    expect(ringsOverlap(square(5.05, 51.54, 5.06, 51.55), tilburg)).toBe(true)
    expect(ringsOverlap(tilburg, square(5.05, 51.54, 5.06, 51.55))).toBe(true)
    // Two rectangles that cross like a plus sign share no vertices.
    expect(ringsOverlap(square(5.0, 51.55, 5.2, 51.56), square(5.07, 51.5, 5.08, 51.7))).toBe(true)
    expect(ringsOverlap(tilburg, square(6, 52, 6.1, 52.1))).toBe(false)
  })
  it('builds a bounding ring with a margin', () => {
    const ring = boundingRing([{ lat: 51.5, lng: 5 }, { lat: 51.6, lng: 5.1 }], 100)
    expect(pointInRing({ lat: 51.4995, lng: 4.9995 }, ring)).toBe(true)
    expect(pointInRing({ lat: 51.45, lng: 5.05 }, ring)).toBe(false)
  })
  it('reports west, south, east and north bounds', () => {
    expect(bounds([{ lat: 51.5, lng: 5 }, { lat: 51.6, lng: 4.9 }])).toEqual([4.9, 51.5, 5, 51.6])
  })
  it('uses the author area, or a box around the pins', () => {
    const area = square(5, 51, 5.1, 51.1)
    expect(questArea({ area, pins: [{ position: { lat: 0, lng: 0 } }] })).toBe(area)
    const derived = questArea({ pins: [{ position: { lat: 51.5, lng: 5 } }, { position: { lat: 51.51, lng: 5.01 } }] })
    expect(pointInRing({ lat: 51.505, lng: 5.005 }, derived)).toBe(true)
  })
})
