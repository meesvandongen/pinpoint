import { questProblems } from './checks.ts'
import { Quest } from './schema.ts'

const pin = (id: string, lat: number, extra: object = {}) => ({
  id,
  title: { en: id, nl: id },
  position: { lat, lng: 5 },
  clues: [{ type: 'distance' }],
  ...extra,
})

const quest = (extra: object = {}, pins = [pin('a', 51.5), pin('b', 51.51)]) =>
  Quest.parse({ id: 'q', title: { en: 'Q', nl: 'Q' }, pins, ...extra })

describe('quest problems', () => {
  it('has none for a good quest', () => {
    expect(questProblems(quest())).toEqual([])
  })
  it('asks for the default language in every map of texts', () => {
    const problems = questProblems(quest({ title: { nl: 'Q' } }, [pin('a', 51.5, { title: { nl: 'A' } }), pin('b', 51.51)]))
    expect(problems).toEqual([
      expect.stringContaining('title: missing the default language "en"'),
      expect.stringContaining('pins.a.title: missing the default language "en"'),
    ])
  })
  it('accepts plain strings in any language', () => {
    expect(questProblems(quest({ title: 'Q' }, [pin('a', 51.5, { title: 'A' }), pin('b', 51.51)]))).toEqual([])
  })
  it('keeps pins inside an area the author drew', () => {
    const area = [{ lat: 51.495, lng: 4.99 }, { lat: 51.495, lng: 5.01 }, { lat: 51.505, lng: 5.01 }, { lat: 51.505, lng: 4.99 }]
    expect(questProblems(quest({ area }))).toEqual([expect.stringContaining('pins.b: lies outside the quest area')])
  })
  it('catches pins that sit inside each other', () => {
    const problems = questProblems(quest({}, [pin('a', 51.5), pin('b', 51.5002)]))
    expect(problems).toEqual([expect.stringContaining('only 22 m apart')])
  })
})
