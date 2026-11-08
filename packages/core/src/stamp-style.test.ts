import { INKS, splitTitle, stampStyle } from './stamp-style.ts'

describe('stamp style', () => {
  const pin = { id: 'chimney', category: 'chimney' as const }
  it('is the same every time for the same pin', () => {
    expect(stampStyle(pin)).toEqual(stampStyle(pin))
  })
  it('uses a palette ink and the category icon', () => {
    const style = stampStyle(pin)
    expect(INKS).toContain(style.ink)
    expect(style.icon).toBe('chimney')
  })
  it('lets the author decide', () => {
    expect(stampStyle({ ...pin, stamp: { shape: 'ticket', ink: '#123456', icon: 'tower' } })).toEqual({
      shape: 'ticket',
      ink: '#123456',
      icon: 'tower',
    })
  })
  it('suggests a shape from the category or its parents', () => {
    expect(stampStyle({ id: 'x', category: 'bridge' }).shape).toBe('hex')
    expect(stampStyle({ id: 'x', category: 'lighthouse' }).shape).toBe('hex')
    expect(stampStyle({ id: 'x', category: 'pub' }).shape).toBe('postage')
  })
  it('varies the fallback between pins', () => {
    const shapes = new Set(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map((id) => stampStyle({ id: `pin-${id}`, category: 'other' }).shape))
    expect(shapes.size).toBeGreaterThan(1)
  })
})

describe('title split', () => {
  it('fits a name on two short lines', () => {
    expect(splitTitle('Market clock')).toEqual(['MARKET', 'CLOCK'])
    expect(splitTitle('Canal')).toEqual(['CANAL', ''])
  })
  it('clips lines that are too long', () => {
    expect(splitTitle('Schoorsteenveger', 9)).toEqual(['SCHOORST…', ''])
    expect(splitTitle('A very long name indeed', 9)).toEqual(['A VERY', 'LONG NAM…'])
  })
})
