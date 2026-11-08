import { isRaining } from './weather.ts'

const here = { lat: 51.5607, lng: 5.0768 }

function mockFetch(response: Partial<Response> | Error) {
  const fn = vi.fn(async () => {
    if (response instanceof Error) throw response
    return response as Response
  })
  vi.stubGlobal('fetch', fn)
  return fn
}

afterEach(() => vi.unstubAllGlobals())

describe('isRaining', () => {
  it('asks for rounded coordinates, so the exact position is not sent', async () => {
    const fn = mockFetch({ ok: true, json: async () => ({ current: { precipitation: 0 } }) })
    await isRaining(here)
    const url = String((fn.mock.calls[0] as unknown[])[0])
    expect(url).toContain('latitude=51.56')
    expect(url).toContain('longitude=5.08')
    expect(url).not.toContain('51.5607')
  })
  it('calls any measurable rain rain', async () => {
    mockFetch({ ok: true, json: async () => ({ current: { precipitation: 0.4 } }) })
    expect(await isRaining(here)).toBe(true)
    mockFetch({ ok: true, json: async () => ({ current: { precipitation: 0 } }) })
    expect(await isRaining(here)).toBe(false)
  })
  it('gives up quietly when the lookup fails', async () => {
    mockFetch(new Error('offline'))
    expect(await isRaining(here)).toBeUndefined()
    mockFetch({ ok: false, status: 429 })
    expect(await isRaining(here)).toBeUndefined()
    mockFetch({ ok: true, json: async () => ({}) })
    expect(await isRaining(here)).toBeUndefined()
  })
})
