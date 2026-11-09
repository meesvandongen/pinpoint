import {
  arrivalPages,
  arrowRotation,
  extrasOf,
  formatDistance,
  locationsContaining,
  pinChances,
  pointsLeft,
  playablePins,
  proximity,
  questsInLocation,
  roughArea,
  resolveClues,
  resolveText,
  stampPoints,
  wordLength,
  wordShape,
  type Stamp,
} from './play.ts'
import { distanceMeters } from './geo.ts'
import { Location, Quest } from './schema.ts'

const pin = (id: string, lat: number, lng: number, clues: unknown[] = [{ type: 'distance' }]) => ({
  id,
  title: id,
  position: { lat, lng },
  clues,
})
const quest = (order: 'linear' | 'free' = 'linear') =>
  Quest.parse({ id: 'q', title: 'Q', order, pins: [pin('a', 51.56, 5.08), pin('b', 51.561, 5.081), pin('c', 51.562, 5.082)] })

describe('proximity', () => {
  const target = { position: { lat: 51.56, lng: 5.08 }, radius: 40 }
  it('is arrived inside the radius with a good fix', () => {
    expect(proximity({ lat: 51.56, lng: 5.0803, accuracy: 10 }, target).state).toBe('arrived')
  })
  it('is only near when the fix is too vague', () => {
    expect(proximity({ lat: 51.56, lng: 5.0803, accuracy: 120 }, target).state).toBe('near')
  })
  it('is near just outside the radius when accuracy overlaps it', () => {
    // About 60 m east with 30 m accuracy: the true position could be inside.
    expect(proximity({ lat: 51.56, lng: 5.0809, accuracy: 30 }, target).state).toBe('near')
  })
  it('is far when clearly outside', () => {
    expect(proximity({ lat: 51.57, lng: 5.09, accuracy: 10 }, target).state).toBe('far')
  })
})

describe('formatting', () => {
  it('rounds distances for display', () => {
    expect(formatDistance(3)).toBe('5 m')
    expect(formatDistance(47)).toBe('45 m')
    expect(formatDistance(243)).toBe('240 m')
    expect(formatDistance(1234)).toBe('1.2 km')
    expect(formatDistance(25000)).toBe('25 km')
  })
  it('rotates the arrow against the heading', () => {
    expect(arrowRotation(90)).toBe(90)
    expect(arrowRotation(90, 90)).toBe(0)
    expect(arrowRotation(10, 350)).toBe(20)
  })
})

describe('quest order', () => {
  it('offers one pin when linear and all open pins when free', () => {
    expect(playablePins(quest('linear'), new Set()).map((p) => p.id)).toEqual(['a'])
    expect(playablePins(quest('linear'), new Set(['a'])).map((p) => p.id)).toEqual(['b'])
    expect(playablePins(quest('free'), new Set(['b'])).map((p) => p.id)).toEqual(['a', 'c'])
    expect(playablePins(quest('free'), new Set(['a', 'b', 'c']))).toEqual([])
  })
})

describe('clues', () => {
  const clues = [
    { type: 'text', text: 'riddle' },
    { type: 'distance' },
    { type: 'direction', reveal: { onRequest: true } },
    { type: 'map', reveal: { onRequest: true } },
    { type: 'smell', note: 'unknown to this version' },
  ]
  const p = Quest.parse({ id: 'q', title: 'Q', pins: [pin('a', 51.56, 5.08, clues)] }).pins[0]
  it('holds back clues that are asked for, and skips unknown types', () => {
    const states = resolveClues(p, { requested: new Set() })
    expect(states.map((s) => [s.clue.type, s.visible])).toEqual([
      ['text', true],
      ['distance', true],
      ['direction', false],
      ['map', false],
    ])
  })
  it('shows a clue once it was asked for', () => {
    const states = resolveClues(p, { requested: new Set([2, 3]) })
    expect(states.every((s) => s.visible)).toBe(true)
  })
  it('rejects the old time rule, so a quest never changes silently', () => {
    expect(() => Quest.parse({ id: 'q', title: 'Q', pins: [pin('a', 51.56, 5.08, [{ type: 'distance', reveal: { afterSeconds: 30 } }])] })).toThrow()
  })
  it('hides distance, direction and map for experts', () => {
    const states = resolveClues(p, { requested: new Set([2, 3]), expert: true })
    expect(states.map((s) => s.clue.type)).toEqual(['text'])
  })
  it('shows the shape of a word', () => {
    expect(wordShape('De Schoorsteen').map((c) => c.char).join('')).toBe('D_ S__________')
    expect(wordShape('Pier', false).every((c) => !c.known)).toBe(true)
    expect(wordLength('De Schoorsteen')).toBe(13)
  })
})

describe('locations', () => {
  const loc = (id: string, w: number, s: number, e: number, n: number) =>
    Location.parse({
      id,
      name: id,
      polygon: [
        { lat: s, lng: w },
        { lat: s, lng: e },
        { lat: n, lng: e },
        { lat: n, lng: w },
      ],
    })
  const all = [loc('nl', 3.35, 50.75, 7.23, 53.55), loc('tilburg', 5.02, 51.52, 5.14, 51.6), loc('nb', 4.3, 51.27, 6.05, 51.83)]
  it('suggests the smallest place first', () => {
    expect(locationsContaining({ lat: 51.56, lng: 5.08 }, all).map((l) => l.id)).toEqual(['tilburg', 'nb', 'nl'])
    expect(locationsContaining({ lat: 52.37, lng: 4.9 }, all).map((l) => l.id)).toEqual(['nl'])
  })
  it('lists quests whose area overlaps a location', () => {
    expect(questsInLocation(all[1], [quest()])).toHaveLength(1)
    expect(questsInLocation(loc('far', 6, 52, 6.1, 52.1), [quest()])).toHaveLength(0)
  })
})

describe('text', () => {
  it('prefers the player language, then the default, then anything', () => {
    const t = { en: 'Hello', nl: 'Hallo' }
    expect(resolveText(t, ['nl-NL'])).toBe('Hallo')
    expect(resolveText(t, ['de'], 'en')).toBe('Hello')
    expect(resolveText({ fr: 'Salut' }, ['de'], 'en')).toBe('Salut')
    expect(resolveText('plain', ['nl'])).toBe('plain')
  })
})

describe('extra marks', () => {
  const base: Stamp = { questId: 'q', pinId: 'a', at: '2026-11-08T10:00:00Z', clues: [], hints: 0, chances: 0 }
  it('earns none by default', () => {
    expect(extrasOf(base)).toEqual([])
    expect(extrasOf({ ...base, quiz: {} })).toEqual([])
  })
  it('counts a wrong quiz answer as answering', () => {
    expect(extrasOf({ ...base, quiz: { 0: 'wrong' } })).toEqual(['quiz'])
  })
  it('lists marks in a fixed order', () => {
    const all: Stamp = { ...base, weather: 'rain', sky: 'night', photo: true, quiz: { 1: 'correct' } }
    expect(extrasOf(all)).toEqual(['quiz', 'photo', 'night', 'rain'])
    expect(extrasOf({ ...base, sky: 'sunrise' })).toEqual(['sunrise'])
  })
})

describe('rough area', () => {
  it('always contains the pin without being centred on it, and stays put', () => {
    for (const id of ['chimney', 'market', 'harbour', 'a', 'oak', 'bandstand', 'castle']) {
      const pin = { id, position: { lat: 51.56, lng: 5.08 }, radius: 40 }
      const area = roughArea(pin)
      const off = distanceMeters(area.center, pin.position)
      expect(off, id).toBeLessThan(area.radius * 0.55)
      expect(off, id).toBeGreaterThan(area.radius * 0.15)
      expect(roughArea(pin)).toEqual(area)
    }
  })
  it('grows with the pin radius', () => {
    const small = roughArea({ id: 'x', position: { lat: 0, lng: 0 }, radius: 40 })
    const big = roughArea({ id: 'x', position: { lat: 0, lng: 0 }, radius: 150 })
    expect(big.radius).toBeGreaterThan(small.radius)
  })
})

describe('stamp points', () => {
  it('starts every pin with three stars', () => {
    expect(stampPoints({ hints: 0, chances: 0 })).toBe(3)
    expect(stampPoints({ hints: 0, chances: 7 })).toBe(3)
  })
  it('keeps three stars while at least three chances are untouched', () => {
    // Five chances: two slips are free, then each one costs a star.
    expect(pointsLeft(5, 2)).toBe(3)
    expect(pointsLeft(5, 3)).toBe(2)
    expect(pointsLeft(5, 4)).toBe(1)
    expect(pointsLeft(5, 5)).toBe(0)
  })
  it('takes a star for every slip at a pin with three chances or fewer', () => {
    expect(pointsLeft(3, 1)).toBe(2)
    expect(pointsLeft(2, 1)).toBe(2)
    expect(pointsLeft(2, 2)).toBe(1)
    expect(pointsLeft(0, 0)).toBe(3)
  })
  it('counts hints asked and wrong answers as slips', () => {
    expect(stampPoints({ hints: 1, chances: 4, quiz: { 3: 'wrong', 5: 'correct' } })).toBe(2)
    expect(stampPoints({ hints: 4, chances: 5, quiz: { 3: 'wrong' } })).toBe(0)
  })
})

describe('chances', () => {
  it('counts hints to ask for and questions, not clues shown from the start', () => {
    const parsed = Quest.parse({
      id: 'q',
      title: 'Q',
      pins: [
        pin('a', 51.56, 5.08, [
          { type: 'text', text: 'x' },
          { type: 'distance' },
          { type: 'map', reveal: { onRequest: true } },
          { type: 'smell', reveal: { onRequest: true } },
        ]),
      ],
    })
    const a = parsed.pins[0]
    expect(pinChances(a)).toBe(1)
    const withQuestions = { ...a, arrival: [quiz, { type: 'fact', text: 'f' }, quiz] } as typeof a
    expect(pinChances(withQuestions)).toBe(3)
  })
})

const quiz = { type: 'quiz', question: 'q', options: ['a', 'b'], answer: 0 }

describe('arrival pages', () => {
  it('puts the photo page first when the pin does not place it', () => {
    expect(arrivalPages({ arrival: [] }).map((p) => p.kind)).toEqual(['photo'])
    expect(arrivalPages({ arrival: [{ type: 'fact', text: 'f' }, quiz] as never }).map((p) => p.kind)).toEqual(['photo', 'fact', 'quiz'])
  })
  it('follows the order of the pin, skipping steps it does not know', () => {
    const pages = arrivalPages({ arrival: [quiz, { type: 'fact', text: 'f' }, { type: 'dance' }, { type: 'photo', prompt: 'p' }, quiz] as never })
    expect(pages.map((p) => p.kind)).toEqual(['quiz', 'fact', 'photo', 'quiz'])
    expect(pages.flatMap((p) => (p.kind === 'quiz' ? [p.index] : []))).toEqual([0, 4])
  })
})
