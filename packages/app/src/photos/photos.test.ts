import 'fake-indexeddb/auto'
import { clearPhotos, deletePhoto, getPhoto, listPhotos, photoKey, putPhoto } from './db.ts'
import { fitWithin } from './resize.ts'

const photo = (questId: string, pinId: string, at: string) => ({
  questId,
  pinId,
  blob: new Blob([`${questId}${pinId}`], { type: 'image/jpeg' }),
  width: 800,
  height: 600,
  at,
})

describe('photo store', () => {
  afterEach(async () => {
    await clearPhotos()
  })

  it('keeps one photo per pin and replaces it when taken again', async () => {
    await putPhoto(photo('q', 'a', '2026-11-08T10:00:00Z'))
    await putPhoto({ ...photo('q', 'a', '2026-11-08T11:00:00Z'), width: 1000 })
    const stored = await getPhoto('q', 'a')
    expect(stored?.width).toBe(1000)
    expect(stored?.key).toBe(photoKey('q', 'a'))
    expect(await listPhotos('q')).toHaveLength(1)
  })
  it('lists the photos of a quest in the order they were taken', async () => {
    await putPhoto(photo('q', 'b', '2026-11-08T12:00:00Z'))
    await putPhoto(photo('q', 'a', '2026-11-08T10:00:00Z'))
    await putPhoto(photo('other', 'x', '2026-11-08T09:00:00Z'))
    expect((await listPhotos('q')).map((p) => p.pinId)).toEqual(['a', 'b'])
  })
  it('deletes one photo or all of them', async () => {
    await putPhoto(photo('q', 'a', '2026-11-08T10:00:00Z'))
    await putPhoto(photo('q', 'b', '2026-11-08T11:00:00Z'))
    await deletePhoto('q', 'a')
    expect(await getPhoto('q', 'a')).toBeUndefined()
    await clearPhotos()
    expect(await listPhotos('q')).toEqual([])
  })
})

describe('fitWithin', () => {
  it('shrinks the longer side to the limit and keeps the proportions', () => {
    expect(fitWithin(4000, 3000, 1600)).toEqual({ width: 1600, height: 1200 })
    expect(fitWithin(3000, 4000, 1600)).toEqual({ width: 1200, height: 1600 })
  })
  it('never enlarges', () => {
    expect(fitWithin(800, 600, 1600)).toEqual({ width: 800, height: 600 })
  })
})
