import { http, HttpResponse, passthrough, type HttpHandler } from 'msw'
import type { MockRepository } from 'gitvfs-github-msw'
import { WEATHER_ENDPOINT } from '../weather.ts'
import { testState } from './bridge.ts'
import { MOCK_REPO } from './seed.ts'

const MIME: Record<string, string> = { json: 'application/json', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', mp3: 'audio/mpeg' }

/** Open-Meteo, with the weather the tester picked. "Real" lets the request through. */
export function weatherHandler(): HttpHandler {
  return http.get(WEATHER_ENDPOINT, () => {
    const { weather } = testState.get()
    if (weather === 'real') return passthrough()
    return HttpResponse.json({ current: { time: new Date().toISOString(), precipitation: weather === 'rain' ? 1.4 : 0 } })
  })
}

/**
 * Serves `/content/*` from the mocked repository instead of the files baked into the build, so a
 * quest saved in the preview editor can be played straight away. Files the repository does not have
 * (photos and sounds) come from the build.
 */
export function contentHandler(repository: MockRepository): HttpHandler {
  const names = (folder: string) =>
    ((repository.list(MOCK_REPO.branch, `content/${folder}`) as { path: string; type: string }[] | undefined) ?? [])
      .filter((entry) => entry.type === 'file' && entry.path.endsWith('.json'))
      .map((entry) => entry.path.replace(/^content\//, ''))
      .sort((a, b) => a.localeCompare(b))

  return http.get('/content/*', ({ request }) => {
    const path = decodeURIComponent(new URL(request.url).pathname.replace(/^\/content\//, ''))
    if (path === 'index.json') return HttpResponse.json({ locations: names('locations'), quests: names('quests') })
    const file = repository.readFile(MOCK_REPO.branch, `content/${path}`)
    if (!file) return passthrough()
    return new HttpResponse(file.content as BodyInit, {
      headers: { 'content-type': MIME[path.split('.').pop() ?? ''] ?? 'application/octet-stream' },
    })
  })
}
