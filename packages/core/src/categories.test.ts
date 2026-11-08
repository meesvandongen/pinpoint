import { CATEGORY_IDS, categoryChain } from './categories.ts'

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
    expect(categoryChain('industrial')).toEqual(['industrial', 'building', 'other'])
  })
})
