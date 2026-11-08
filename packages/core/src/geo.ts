import type { Position, Ring } from './schema.ts'

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

/** The point `meters` away from `from`, heading `bearing` degrees clockwise from north. */
export function destinationPoint(from: Position, meters: number, bearing: number): Position {
  const angular = meters / EARTH_RADIUS_M
  const theta = rad(bearing)
  const lat1 = rad(from.lat)
  const lng1 = rad(from.lng)
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(angular) + Math.cos(lat1) * Math.sin(angular) * Math.cos(theta),
  )
  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(theta) * Math.sin(angular) * Math.cos(lat1),
      Math.cos(angular) - Math.sin(lat1) * Math.sin(lat2),
    )
  return { lat: deg(lat2), lng: ((deg(lng2) + 540) % 360) - 180 }
}

/** Moves from one point towards another by at most `meters`, stopping at the target. */
export function moveToward(from: Position, to: Position, meters: number): Position {
  const remaining = distanceMeters(from, to)
  if (remaining <= meters) return { lat: to.lat, lng: to.lng }
  return destinationPoint(from, meters, bearingDegrees(from, to))
}

/** A polygon ring approximating a circle, for drawing radii and rough areas on a map. */
export function circleRing(center: Position, radiusMeters: number, steps = 48): Ring {
  return Array.from({ length: steps }, (_, i) => destinationPoint(center, radiusMeters, (i * 360) / steps))
}

export type Cardinal = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW'
const CARDINALS: Cardinal[] = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']

export function cardinal(bearing: number): Cardinal {
  return CARDINALS[Math.round((((bearing % 360) + 360) % 360) / 45) % 8]
}

/** Ray casting. The ring is closed implicitly. */
export function pointInRing(p: Position, ring: Ring): boolean {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const { lng: xi, lat: yi } = ring[i]
    const { lng: xj, lat: yj } = ring[j]
    if (yi > p.lat !== yj > p.lat && p.lng < ((xj - xi) * (p.lat - yi)) / (yj - yi) + xi) {
      inside = !inside
    }
  }
  return inside
}

/** Approximate area in square metres, good enough to order nested places. */
export function ringArea(ring: Ring): number {
  const lat0 = ring.reduce((sum, p) => sum + p.lat, 0) / ring.length
  const kx = (Math.PI / 180) * EARTH_RADIUS_M * Math.cos(rad(lat0))
  const ky = (Math.PI / 180) * EARTH_RADIUS_M
  let area = 0
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    area += ring[j].lng * kx * (ring[i].lat * ky) - ring[i].lng * kx * (ring[j].lat * ky)
  }
  return Math.abs(area) / 2
}

const cross = (o: Position, a: Position, b: Position) =>
  (a.lng - o.lng) * (b.lat - o.lat) - (a.lat - o.lat) * (b.lng - o.lng)

function segmentsIntersect(p1: Position, p2: Position, p3: Position, p4: Position): boolean {
  const d1 = cross(p3, p4, p1)
  const d2 = cross(p3, p4, p2)
  const d3 = cross(p1, p2, p3)
  const d4 = cross(p1, p2, p4)
  return d1 * d2 < 0 && d3 * d4 < 0
}

/** True when two rings share any area (one inside the other, or their edges cross). */
export function ringsOverlap(a: Ring, b: Ring): boolean {
  if (a.some((p) => pointInRing(p, b))) return true
  if (b.some((p) => pointInRing(p, a))) return true
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
    { lat: s, lng: w },
    { lat: s, lng: e },
    { lat: n, lng: e },
    { lat: n, lng: w },
  ]
}

/** The smallest `[west, south, east, north]` box around the points. */
export function bounds(points: Position[]): [number, number, number, number] {
  return [
    Math.min(...points.map((p) => p.lng)),
    Math.min(...points.map((p) => p.lat)),
    Math.max(...points.map((p) => p.lng)),
    Math.max(...points.map((p) => p.lat)),
  ]
}

/** The quest's area, or a rectangle around its pins when the author gave none. */
export function questArea(
  quest: { area?: Ring; pins: { position: Position }[] },
  marginMeters = 150,
): Ring {
  return quest.area ?? boundingRing(quest.pins.map((p) => p.position), marginMeters)
}
