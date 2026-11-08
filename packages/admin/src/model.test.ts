import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { LocationFile, QuestFile } from 'pinpoint-core'
import { locationSchema, questSchema } from './model.ts'

const contentDir = join(import.meta.dirname, '../../../content')
const read = (folder: string) =>
  readdirSync(join(contentDir, folder))
    .filter((f: string) => f.endsWith('.json'))
    .map((f: string) => ({ name: f, data: JSON.parse(readFileSync(join(contentDir, folder, f), 'utf8')) as Record<string, any> }))

const quests = read('quests')
const locations = read('locations')

describe('the editor model and the game model agree', () => {
  it('accept every file in content/', () => {
    for (const { name, data } of quests) {
      expect(questSchema.safeParse(data).success, name).toBe(true)
      expect(QuestFile.safeParse(data).success, name).toBe(true)
    }
    for (const { name, data } of locations) {
      expect(locationSchema.safeParse(data).success, name).toBe(true)
      expect(LocationFile.safeParse(data).success, name).toBe(true)
    }
  })

  const base = quests.find((q) => q.name === 'tilburg-textile.json')!.data
  const clone = () => structuredClone(base)
  const mutations: Record<string, (q: any) => void> = {
    'a bad pin id': (q) => (q.pins[0].id = 'Not A Slug'),
    'no pins': (q) => (q.pins = []),
    'a duplicate pin id': (q) => (q.pins[1].id = q.pins[0].id),
    'a pin without clues': (q) => (q.pins[0].clues = []),
    'a text clue without text': (q) => (q.pins[0].clues[0] = { type: 'text' }),
    'an audio clue without a file': (q) => (q.pins[0].clues[0] = { type: 'audio' }),
    'an unknown category': (q) => (q.pins[0].category = 'spaceship'),
    'a latitude out of range': (q) => (q.pins[0].position.lat = 91),
    'a radius that is too small': (q) => (q.pins[0].radius = 5),
    'a hint that is too long': (q) => (q.pins[0].clues[0] = { type: 'text', text: 'x'.repeat(200) }),
    'a title that is too long': (q) => (q.title = 'x'.repeat(100)),
    'a quiz answer that points nowhere': (q) => (q.pins[0].quiz.answer = 9),
    'a bad language code': (q) => (q.title = { 'not a language': 'x' }),
    'an area with two corners': (q) => (q.area = [{ lat: 1, lng: 1 }, { lat: 2, lng: 2 }]),
    'a stamp colour that is not a colour': (q) => (q.pins[0].stamp = { ink: 'purple' }),
    'a clue type from the future (fine)': (q) => q.pins[0].clues.push({ type: 'smell', note: 'x' }),
    'a hint of exactly the limit (fine)': (q) => (q.pins[0].clues[0] = { type: 'text', text: 'x'.repeat(140) }),
  }
  for (const [name, mutate] of Object.entries(mutations)) {
    it(`agree about ${name}`, () => {
      const q = clone()
      mutate(q)
      expect(questSchema.safeParse(q).success).toBe(QuestFile.safeParse(q).success)
    })
  }

  it('reject some of those, so the check above has teeth', () => {
    const rejected = Object.entries(mutations).filter(([, mutate]) => {
      const q = clone()
      mutate(q)
      return !QuestFile.safeParse(q).success
    })
    expect(rejected.length).toBeGreaterThanOrEqual(13)
  })

  it('agree about locations', () => {
    const l = structuredClone(locations[0].data)
    expect(locationSchema.safeParse(l).success).toBe(LocationFile.safeParse(l).success)
    l.polygon = l.polygon.slice(0, 2)
    expect(locationSchema.safeParse(l).success).toBe(false)
    expect(LocationFile.safeParse(l).success).toBe(false)
  })
})
