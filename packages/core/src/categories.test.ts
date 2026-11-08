import { CATEGORY_IDS, categoryChain, isCategory } from './categories.ts'
import { mappedCategories } from './osm.ts'

describe('categories', () => {
  it('every category falls back to other without loops', () => {
    for (const id of CATEGORY_IDS) {
      const chain = categoryChain(id)
      expect(chain[0]).toBe(id)
      expect(chain.at(-1)).toBe('other')
      expect(new Set(chain).size).toBe(chain.length)
    }
  })
  it('follows the parents', () => {
    expect(categoryChain('chimney')).toEqual(['chimney', 'industrial', 'building', 'other'])
  })
  it('recognises ids', () => {
    expect(isCategory('church')).toBe(true)
    expect(isCategory('toString')).toBe(false)
  })
  it('every category has an OpenStreetMap tag pointing at it, except the generic fallback', () => {
    const mapped = mappedCategories()
    const orphans = CATEGORY_IDS.filter((id) => id !== 'other' && !mapped.has(id))
    expect(orphans).toEqual([])
  })
})
