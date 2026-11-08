import fixture from './osm-values.json' with { type: 'json' }
import { isCategory } from './categories.ts'
import { osmCategory } from './osm.ts'

type Fixture = { dataUntil: string; keys: Record<string, { value: string; count: number }[]> }
const data = fixture as Fixture

describe('OpenStreetMap coverage', () => {
  const rows = Object.entries(data.keys).flatMap(([key, values]) =>
    values.map(({ value, count }) => ({ key, value, count, target: osmCategory(key, value) })),
  )

  it('maps known tags to categories', () => {
    expect(osmCategory('man_made', 'chimney')).toBe('chimney')
    expect(osmCategory('amenity', 'place_of_worship')).toBe('religious')
    expect(osmCategory('building', 'church')).toBe('church')
    expect(osmCategory('shop', 'bakery')).toBe('shop')
    expect(osmCategory('tourism', 'guest_house;apartment')).toBe('hotel')
    expect(osmCategory('amenity', 'bench')).toBe('ignore')
  })
  it('does not know tags it was not told about', () => {
    expect(osmCategory('amenity', 'flying_saucer_dock')).toBeUndefined()
    expect(osmCategory('constructor', 'x')).toBeUndefined()
  })
  it('only points at real categories', () => {
    for (const row of rows) if (row.target && row.target !== 'ignore') expect(isCategory(row.target)).toBe(true)
  })
  it('covers the most used values of every key, by value count and by use', () => {
    const missing = rows.filter((r) => r.target === undefined)
    const byValue = 1 - missing.length / rows.length
    const total = rows.reduce((sum, r) => sum + r.count, 0)
    const byUse = 1 - missing.reduce((sum, r) => sum + r.count, 0) / total
    // Printed so a failing run says which values to look at.
    if (missing.length) console.info(`Unmapped (taginfo data until ${data.dataUntil}):`, missing.map((r) => `${r.key}=${r.value}`).join(' '))
    expect(byValue).toBeGreaterThanOrEqual(0.97)
    expect(byUse).toBeGreaterThanOrEqual(0.99)
  })
  it('sends most real destinations to something more specific than other', () => {
    const destinations = rows.filter((r) => r.target && r.target !== 'ignore')
    expect(destinations.length).toBeGreaterThan(150)
    expect(destinations.every((r) => r.target !== 'other')).toBe(true)
  })
})
