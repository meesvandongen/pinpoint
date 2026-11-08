import { skyAt, sunAltitude } from './sun.ts'

const tilburg = { lat: 51.56, lng: 5.08 }

describe('sun', () => {
  it('stands at colatitude plus declination at solar noon', () => {
    // 21 June: declination 23.44. Solar noon in Tilburg is about 11:41 UTC.
    const noon = sunAltitude(new Date('2026-06-21T11:41:00Z'), tilburg)
    expect(noon).toBeGreaterThan(61.5)
    expect(noon).toBeLessThan(62.3)
  })
  it('is highest at the equator on an equinox', () => {
    const noon = sunAltitude(new Date('2026-03-20T12:00:00Z'), { lat: 0, lng: 0 })
    expect(noon).toBeGreaterThan(87)
  })
  it('is below the horizon at midnight, even in midsummer', () => {
    const midnight = sunAltitude(new Date('2026-06-21T23:41:00Z'), tilburg)
    expect(midnight).toBeLessThan(-12)
    expect(midnight).toBeGreaterThan(-17)
  })
  it('tells night from day', () => {
    expect(skyAt(new Date('2026-12-21T23:00:00Z'), tilburg)).toBe('night')
    expect(skyAt(new Date('2026-12-21T11:30:00Z'), tilburg)).toBe('day')
  })
  it('calls the first light of the morning sunrise, but not the same hour in the evening', () => {
    // 21 December in Tilburg: the sun clears the horizon at about 07:45 UTC and sets near 15:30 UTC.
    const morning = skyAt(new Date('2026-12-21T07:30:00Z'), tilburg)
    expect(morning).toBe('sunrise')
    // Around sunset the sun is just as low, but falling.
    const evening = skyAt(new Date('2026-12-21T15:10:00Z'), tilburg)
    expect(evening).toBe('day')
  })
})
