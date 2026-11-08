import type { Pin, Position, Quest, Ring } from './schema.ts'

const EARTH_RADIUS_M = 6371008.8
const rad = (deg: number) => (deg * Math.PI) / 180
const deg = (r: number) => (r * 180) / Math.PI

/** Great-circle distance in metres. */
export function distanceMeters(a: Position, b: Position): number {
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)))
}

/** Initial bearing from one point to another, 0 to 360 degrees clockwise from north. */
export function bearingDegrees(from: Position, to: Position): number {
  const dLng = rad(to.lng - from.lng)
  const y = Math.sin(dLng) * Math.cos(rad(to.lat))
  const x =
    Math.cos(rad(from.lat)) * Math.sin(rad(to.lat)) -
    Math.sin(rad(from.lat)) * Math.cos(rad(to.lat)) * Math.cos(dLng)
  return (deg(Math.atan2(y, x)) + 360) % 360
}

export type Cardinal = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW'
const CARDINALS: Cardinal[] = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']

export function cardinal(bearing: number): Cardinal {
  return CARDINALS[Math.round((((bearing % 360) + 360) % 360) / 45) % 8]
}

/** Ray casting. The ring is `[lng, lat]` pairs; it is closed implicitly. */
export function pointInRing(p: Position, ring: Ring): boolean {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    if (yi > p.lat !== yj > p.lat && p.lng < ((xj - xi) * (p.lat - yi)) / (yj - yi) + xi) {
      inside = !inside
    }
  }
  return inside
}

/** Approximate area in square metres, good enough to order nested places. */
export function ringArea(ring: Ring): number {
  const lat0 = ring.reduce((sum, [, lat]) => sum + lat, 0) / ring.length
  const kx = (Math.PI / 180) * EARTH_RADIUS_M * Math.cos(rad(lat0))
  const ky = (Math.PI / 180) * EARTH_RADIUS_M
  let area = 0
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    area += ring[j][0] * kx * (ring[i][1] * ky) - ring[i][0] * kx * (ring[j][1] * ky)
  }
  return Math.abs(area) / 2
}

type Pt = [number, number]
const cross = (o: Pt, a: Pt, b: Pt) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])

function segmentsIntersect(p1: Pt, p2: Pt, p3: Pt, p4: Pt): boolean {
  const d1 = cross(p3, p4, p1)
  const d2 = cross(p3, p4, p2)
  const d3 = cross(p1, p2, p3)
  const d4 = cross(p1, p2, p4)
  return d1 * d2 < 0 && d3 * d4 < 0
}

/** True when two rings share any area (one inside the other, or their edges cross). */
export function ringsOverlap(a: Ring, b: Ring): boolean {
  if (a.some(([lng, lat]) => pointInRing({ lat, lng }, b))) return true
  if (b.some(([lng, lat]) => pointInRing({ lat, lng }, a))) return true
  for (let i = 0; i < a.length; i++) {
    for (let j = 0; j < b.length; j++) {
      if (segmentsIntersect(a[i], a[(i + 1) % a.length], b[j], b[(j + 1) % b.length])) return true
    }
  }
  return false
}

/** A rectangle around the points, grown by a margin in metres. */
export function boundingRing(points: Position[], marginMeters = 0): Ring {
  const lats = points.map((p) => p.lat)
  const lngs = points.map((p) => p.lng)
  const dLat = deg(marginMeters / EARTH_RADIUS_M)
  const midLat = (Math.min(...lats) + Math.max(...lats)) / 2
  const dLng = deg(marginMeters / (EARTH_RADIUS_M * Math.cos(rad(midLat))))
  const s = Math.min(...lats) - dLat
  const n = Math.max(...lats) + dLat
  const w = Math.min(...lngs) - dLng
  const e = Math.max(...lngs) + dLng
  return [
    [w, s],
    [e, s],
    [e, n],
    [w, n],
  ]
}

/** The quest's area, or a rectangle around its pins when the author gave none. */
export function questArea(quest: Pick<Quest, 'area' | 'pins'>, marginMeters = 150): Ring {
  return quest.area ?? boundingRing(quest.pins.map((p: Pin) => p.position), marginMeters)
}
