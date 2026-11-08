import type { Position } from './schema.ts'

const rad = (d: number) => (d * Math.PI) / 180
const deg = (r: number) => (r * 180) / Math.PI
const mod = (x: number, n: number) => ((x % n) + n) % n

/**
 * Height of the sun above the horizon in degrees (negative below it), from a low-precision solar
 * position formula. Good to a few hundredths of a degree, which is plenty for "is it dark".
 */
export function sunAltitude(date: Date, position: Position): number {
  const days = date.getTime() / 86_400_000 + 2_440_587.5 - 2_451_545.0 // since J2000.0
  const meanLongitude = mod(280.46 + 0.9856474 * days, 360)
  const meanAnomaly = rad(mod(357.528 + 0.9856003 * days, 360))
  const eclipticLongitude = rad(
    meanLongitude + 1.915 * Math.sin(meanAnomaly) + 0.02 * Math.sin(2 * meanAnomaly),
  )
  const obliquity = rad(23.439 - 0.0000004 * days)
  const rightAscension = Math.atan2(Math.cos(obliquity) * Math.sin(eclipticLongitude), Math.cos(eclipticLongitude))
  const declination = Math.asin(Math.sin(obliquity) * Math.sin(eclipticLongitude))
  const siderealTime = mod(280.46061837 + 360.98564736629 * days + position.lng, 360)
  const hourAngle = rad(siderealTime) - rightAscension
  const lat = rad(position.lat)
  return deg(
    Math.asin(Math.sin(lat) * Math.sin(declination) + Math.cos(lat) * Math.cos(declination) * Math.cos(hourAngle)),
  )
}

export type Sky = 'night' | 'sunrise' | 'day'

/** Below this the sun is more than six degrees under the horizon: past civil twilight. */
const NIGHT = -6
/** The upper edge of the sunrise window, a little after the sun clears the horizon. */
const SUNRISE_END = 6

/**
 * `night` once civil twilight is over, `sunrise` from the first light until the sun is a few
 * degrees up, `day` otherwise. Evenings count as `day` until dark, then `night`.
 */
export function skyAt(date: Date, position: Position): Sky {
  const altitude = sunAltitude(date, position)
  if (altitude < NIGHT) return 'night'
  if (altitude < SUNRISE_END) {
    const rising = sunAltitude(new Date(date.getTime() + 10 * 60_000), position) > altitude
    if (rising) return 'sunrise'
  }
  return 'day'
}
