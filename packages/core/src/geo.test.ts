import {
  bearingDegrees,
  boundingRing,
  cardinal,
  distanceMeters,
  pointInRing,
  ringArea,
  ringsOverlap,
} from './geo.ts'
import type { Ring } from './schema.ts'

const square = (w: number, s: number, e: number, n: number): Ring => [
  [w, s],
  [e, s],
  [e, n],
  [w, n],
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
})
