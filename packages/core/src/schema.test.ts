import { Pin, Quest, Quiz } from './schema.ts'

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
  it('needs at least one clue', () => {
    expect(Pin.safeParse({ ...base, clues: [] }).success).toBe(false)
  })
  it('keeps clue types it does not know, but rejects malformed known ones', () => {
    expect(Pin.safeParse({ ...base, clues: [{ type: 'audio', src: 'x.mp3' }] }).success).toBe(true)
    expect(Pin.safeParse({ ...base, clues: [{ type: 'text' }] }).success).toBe(false)
  })
  it('checks the quiz answer points at an option', () => {
    expect(Quiz.safeParse({ question: 'q', options: ['a', 'b'], answer: 2 }).success).toBe(false)
    expect(Quiz.safeParse({ question: 'q', options: ['a', 'b'], answer: 1 }).success).toBe(true)
  })
  it('requires unique pin ids and accepts localized text', () => {
    expect(Quest.safeParse({ id: 'q', title: { en: 'Q', nl: 'V' }, pins: [base, base] }).success).toBe(false)
    expect(Quest.safeParse({ id: 'q', title: { en: 'Q', nl: 'V' }, pins: [base] }).success).toBe(true)
  })
})
