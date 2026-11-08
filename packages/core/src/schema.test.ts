import { LIMITS, Location, Pin, Quest, Quiz, questLanguages, questTexts } from './schema.ts'

const base = { id: 'a', title: 'A', position: { lat: 51.5, lng: 5 }, clues: [{ type: 'distance' }] }

describe('schema', () => {
  it('applies defaults', () => {
    const pin = Pin.parse(base)
    expect(pin.radius).toBe(40)
    expect(pin.category).toBe('other')
  })
  it('rejects bad coordinates and bad ids', () => {
    expect(Pin.safeParse({ ...base, position: { lat: 91, lng: 5 } }).success).toBe(false)
    expect(Pin.safeParse({ ...base, id: 'Not A Slug' }).success).toBe(false)
  })
  it('rejects unknown categories', () => {
    expect(Pin.safeParse({ ...base, category: 'spaceship' }).success).toBe(false)
    expect(Pin.safeParse({ ...base, category: 'chimney' }).success).toBe(true)
  })
  it('needs at least one clue', () => {
    expect(Pin.safeParse({ ...base, clues: [] }).success).toBe(false)
  })
  it('keeps clue types it does not know, but rejects malformed known ones', () => {
    expect(Pin.safeParse({ ...base, clues: [{ type: 'smell', note: 'x' }] }).success).toBe(true)
    expect(Pin.safeParse({ ...base, clues: [{ type: 'text' }] }).success).toBe(false)
    expect(Pin.safeParse({ ...base, clues: [{ type: 'audio' }] }).success).toBe(false)
    expect(Pin.safeParse({ ...base, clues: [{ type: 'audio', src: 'media/a.mp3' }] }).success).toBe(true)
    expect(Pin.safeParse({ ...base, clues: [{ type: 'wordShape', word: 'Pier' }] }).success).toBe(true)
  })
  it('checks the quiz answer points at an option', () => {
    expect(Quiz.safeParse({ question: 'q', options: ['a', 'b'], answer: 2 }).success).toBe(false)
    expect(Quiz.safeParse({ question: 'q', options: ['a', 'b'], answer: 1 }).success).toBe(true)
  })
  it('requires unique pin ids and accepts localized text', () => {
    expect(Quest.safeParse({ id: 'q', title: { en: 'Q', nl: 'V' }, pins: [base, base] }).success).toBe(false)
    expect(Quest.safeParse({ id: 'q', title: { en: 'Q', nl: 'V' }, pins: [base] }).success).toBe(true)
  })
  it('wants polygons as lat and lng corners', () => {
    const ring = [{ lat: 1, lng: 1 }, { lat: 1, lng: 2 }, { lat: 2, lng: 2 }]
    expect(Location.safeParse({ id: 'x', name: 'X', polygon: ring }).success).toBe(true)
    expect(Location.safeParse({ id: 'x', name: 'X', polygon: ring.slice(0, 2) }).success).toBe(false)
    expect(Location.safeParse({ id: 'x', name: 'X', polygon: [[1, 1], [1, 2], [2, 2]] }).success).toBe(false)
  })
})

describe('length limits', () => {
  it('stops text that would not fit a screen', () => {
    const long = 'x'.repeat(LIMITS.hint + 1)
    expect(Pin.safeParse({ ...base, clues: [{ type: 'text', text: long }] }).success).toBe(false)
    expect(Pin.safeParse({ ...base, clues: [{ type: 'text', text: { en: 'ok', nl: long } }] }).success).toBe(false)
    expect(Pin.safeParse({ ...base, title: 'x'.repeat(LIMITS.title + 1) }).success).toBe(false)
    expect(Pin.safeParse({ ...base, clues: [{ type: 'text', text: 'x'.repeat(LIMITS.hint) }] }).success).toBe(true)
  })
  it('rejects bad language codes and empty text', () => {
    expect(Pin.safeParse({ ...base, title: { 'not a language': 'x' } }).success).toBe(false)
    expect(Pin.safeParse({ ...base, title: '' }).success).toBe(false)
  })
})

describe('languages', () => {
  const quest = Quest.parse({
    id: 'q',
    title: { en: 'Q', nl: 'V' },
    pins: [
      {
        ...base,
        title: { en: 'A', de: 'A' },
        clues: [{ type: 'text', text: { en: 'x', fr: 'y' } }, { type: 'distance' }],
        quiz: { question: 'q', options: [{ en: 'a', es: 'a' }, 'b'], answer: 0 },
      },
    ],
  })
  it('lists the texts of a quest', () => {
    expect(questTexts(quest)).toHaveLength(6)
  })
  it('finds every language, default first', () => {
    expect(questLanguages(quest)).toEqual(['en', 'de', 'es', 'fr', 'nl'])
  })
})
