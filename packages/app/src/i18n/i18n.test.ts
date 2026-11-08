import { CATEGORY_IDS } from 'pinpoint-core'
import { catalogs, createTranslator, interpolate, resolveLanguage } from './index.ts'

const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()

describe('translations', () => {
  const keys = Object.keys(catalogs.en.messages)

  it('has the same keys in every language, with no empty text', () => {
    for (const [lang, { messages }] of Object.entries(catalogs)) {
      expect(Object.keys(messages).sort(), lang).toEqual([...keys].sort())
      for (const [key, text] of Object.entries(messages)) expect(text.trim(), `${lang} ${key}`).not.toBe('')
    }
  })
  it('uses the same placeholders in every language', () => {
    for (const key of keys) {
      const expected = placeholders(catalogs.en.messages[key as keyof typeof catalogs.en.messages])
      for (const [lang, { messages }] of Object.entries(catalogs)) {
        expect(placeholders(messages[key as keyof typeof messages]), `${lang} ${key}`).toEqual(expected)
      }
    }
  })
  it('has one and other for every plural', () => {
    const bases = new Set(keys.filter((k) => k.endsWith('.one') || k.endsWith('.other')).map((k) => k.replace(/\.(one|other)$/, '')))
    expect(bases.size).toBeGreaterThan(0)
    for (const base of bases) {
      expect(keys).toContain(`${base}.one`)
      expect(keys).toContain(`${base}.other`)
    }
  })
  it('names every category in every language', () => {
    for (const [lang, { categories }] of Object.entries(catalogs)) {
      for (const id of CATEGORY_IDS) expect(categories[id].trim(), `${lang} ${id}`).not.toBe('')
    }
  })
})

describe('language choice', () => {
  it('follows the device, falling back to English', () => {
    expect(resolveLanguage('auto', ['nl-NL', 'en'])).toBe('nl')
    expect(resolveLanguage('auto', ['de', 'fr'])).toBe('en')
    expect(resolveLanguage('auto', ['de', 'nl'])).toBe('nl')
  })
  it('lets the player override the device', () => {
    expect(resolveLanguage('en', ['nl'])).toBe('en')
  })
})

describe('translator', () => {
  it('fills in placeholders and leaves unknown ones visible', () => {
    expect(interpolate('{a} and {b}', { a: 1 })).toBe('1 and {b}')
  })
  it('picks plural forms', () => {
    const t = createTranslator('en', ['en'])
    expect(t.tp('quests.count', 1)).toBe('1 quest')
    expect(t.tp('quests.count', 3)).toBe('3 quests')
    expect(createTranslator('nl', ['nl']).tp('quests.count', 2)).toBe('2 speurtochten')
  })
  it('puts the interface language first for quest texts', () => {
    expect(createTranslator('nl', ['en-GB', 'nl-NL']).contentLanguages).toEqual(['nl', 'en-GB'])
  })
  it('translates a category and a date', () => {
    const t = createTranslator('nl', ['nl'])
    expect(t.category('chimney')).toBe('Schoorsteen')
    expect(t.formatDate('2026-11-08T10:00:00Z')).toMatch(/2026/)
  })
})
