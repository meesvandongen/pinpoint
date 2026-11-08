import { skyAt } from 'pinpoint-core'
import { momentWithSky } from './sky.ts'

const tilburg = { lat: 51.56, lng: 5.08 }

describe('momentWithSky', () => {
  const day = new Date('2026-11-08T12:00:00')
  it('finds a moment that really has the requested sky', () => {
    for (const sky of ['night', 'sunrise', 'day'] as const) {
      const moment = momentWithSky(day, tilburg, sky)
      expect(moment, sky).toBeDefined()
      expect(skyAt(moment!, tilburg), sky).toBe(sky)
    }
  })
  it('puts sunrise in the morning', () => {
    const moment = momentWithSky(day, tilburg, 'sunrise')!
    expect(moment.getHours()).toBeGreaterThanOrEqual(5)
    expect(moment.getHours()).toBeLessThanOrEqual(9)
  })
  it('has nothing to find where the sun never sets', () => {
    expect(momentWithSky(new Date('2026-06-21T12:00:00'), { lat: 80, lng: 10 }, 'night')).toBeUndefined()
  })
})
