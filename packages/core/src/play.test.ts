import {
  arrowRotation,
  formatDistance,
  locationsContaining,
  playablePins,
  proximity,
  questsInLocation,
  resolveClues,
  resolveText,
} from './play.ts'
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
    { type: 'direction', reveal: { afterSeconds: 60 } },
    { type: 'map', reveal: { onRequest: true } },
    { type: 'smell', note: 'unknown to this version' },
  ]
  const p = Quest.parse({ id: 'q', title: 'Q', pins: [pin('a', 51.56, 5.08, clues)] }).pins[0]
  it('locks clues by time and by request, and skips unknown types', () => {
    const states = resolveClues(p, { elapsedSeconds: 10, requested: new Set() })
    expect(states.map((s) => [s.clue.type, s.visible, s.lockedBy])).toEqual([
      ['text', true, undefined],
      ['distance', true, undefined],
      ['direction', false, 'time'],
      ['map', false, 'request'],
    ])
  })
  it('unlocks over time and on request', () => {
    const states = resolveClues(p, { elapsedSeconds: 61, requested: new Set([3]) })
    expect(states.every((s) => s.visible)).toBe(true)
  })
  it('hides distance, direction and map for experts', () => {
    const states = resolveClues(p, { elapsedSeconds: 999, requested: new Set([3]), expert: true })
    expect(states.map((s) => s.clue.type)).toEqual(['text'])
  })
})

describe('locations', () => {
  const loc = (id: string, w: number, s: number, e: number, n: number) =>
    Location.parse({ id, name: id, polygon: [[w, s], [e, s], [e, n], [w, n]] })
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
