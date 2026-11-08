import { loadContent } from './content.ts'

const location = {
  name: 'Tilburg',
  polygon: [{ lat: 51.52, lng: 5.02 }, { lat: 51.52, lng: 5.14 }, { lat: 51.6, lng: 5.14 }],
}
const quest = {
  title: 'Wool city',
  pins: [{ id: 'chimney', title: 'Chimney', position: { lat: 51.56, lng: 5.08 }, clues: [{ type: 'distance' }] }],
}

function fetcher(files: Record<string, unknown>) {
  return async (url: string) => {
    const key = url.replace('/content/', '')
    return key in files
      ? { ok: true, status: 200, json: async () => files[key] }
      : { ok: false, status: 404, json: async () => ({}) }
  }
}

describe('loadContent', () => {
  it('takes the id from the file name', async () => {
    const content = await loadContent('/content', {
      fetcher: fetcher({
        'index.json': { locations: ['locations/tilburg.json'], quests: ['quests/tilburg-textile.json'] },
        'locations/tilburg.json': location,
        'quests/tilburg-textile.json': quest,
      }),
    })
    expect(content.locations.map((l) => l.id)).toEqual(['tilburg'])
    expect(content.quests.map((q) => q.id)).toEqual(['tilburg-textile'])
  })
  it('ignores an id written inside the file', async () => {
    const content = await loadContent('/content', {
      fetcher: fetcher({
        'index.json': { locations: [], quests: ['quests/real-id.json'] },
        'quests/real-id.json': { ...quest, id: 'something-else' },
      }),
    })
    expect(content.quests[0].id).toBe('real-id')
  })
  it('skips a bad file and says why, instead of failing the whole game', async () => {
    const invalid: string[] = []
    const content = await loadContent('/content', {
      onInvalid: (path) => invalid.push(path),
      fetcher: fetcher({
        'index.json': { locations: ['locations/tilburg.json', 'locations/broken.json', 'locations/Not A Slug.json'], quests: ['quests/missing.json'] },
        'locations/tilburg.json': location,
        'locations/broken.json': { name: 'No polygon' },
        'locations/Not A Slug.json': location,
      }),
    })
    expect(content.locations.map((l) => l.id)).toEqual(['tilburg'])
    expect(content.quests).toEqual([])
    expect(invalid.sort()).toEqual(['locations/Not A Slug.json', 'locations/broken.json', 'quests/missing.json'])
  })
})
