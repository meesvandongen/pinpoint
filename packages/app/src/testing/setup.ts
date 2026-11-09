import type { QueryClient } from '@tanstack/react-query'
import { clockStore } from '../lib/clock.ts'
import { headingStore } from '../state/heading.ts'
import { locationStore, setSimulatedFix } from '../state/location.ts'
import { bridge, logRequest, testState, type MockWeather } from './bridge.ts'
import { contentHandler, weatherHandler } from './handlers.ts'
import { MOCK_REPO, seedFiles, seedVersion } from './seed.ts'

/**
 * Starts the mocks for dev and preview builds: a GitHub API backed by a copy of `content/` in the
 * browser (so the editor works without an account), the weather, and the content files themselves.
 * Anything else goes to the network as usual.
 */
export async function startTestTools({ queryClient }: { queryClient: QueryClient; router?: unknown }) {
  const [{ setupWorker }, { createGitHubHandlers, MockRepository, persistentRepository }] = await Promise.all([
    import('msw/browser'),
    import('gitvfs-github-msw'),
  ])

  const invalidateContent = () => queryClient.invalidateQueries({ queryKey: ['content'] })

  const store = await persistentRepository({
    key: `pinpoint-preview:${seedVersion()}`,
    seed: () => MockRepository.create({ files: seedFiles(), message: 'Copy of content/ for this preview' }),
  })

  const worker = setupWorker(
    weatherHandler(),
    contentHandler(store.repository),
    ...createGitHubHandlers({
      repositories: [
        {
          owner: MOCK_REPO.owner,
          repo: MOCK_REPO.repo,
          repository: store.repository,
          details: { description: 'A copy of the Pinpoint content that lives in this browser', defaultBranch: MOCK_REPO.branch },
        },
      ],
      user: { login: 'preview-editor', name: 'Preview editor' },
      onChange: () => {
        store.save()
        void invalidateContent()
      },
    }),
  )
  worker.events.on('request:match', ({ request }) => logRequest({ method: request.method, url: request.url, at: Date.now() }))
  await worker.start({ onUnhandledFrame: 'bypass', quiet: true })

  restoreSimulation()

  bridge.set({
    queryClient,
    repository: store.repository,
    resetRepository: async () => {
      await store.reset()
      await invalidateContent()
    },
  })
}

const SESSION_KEY = 'pinpoint.test-tools.v1'

type Saved = { fix?: { lat: number; lng: number; accuracy: number }; heading?: number; time?: number; weather?: MockWeather }

/**
 * Keeps the simulated position, compass, clock and weather for the tab, so a reload does not send the
 * tester back to the device position, and reads `?sim=lat,lng[,accuracy]` so a link can open the
 * preview at a place: `/?sim=51.5607,5.0768`.
 */
export function restoreSimulation() {
  let saved: Saved = {}
  try {
    saved = JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? '{}') as Saved
  } catch {
    saved = {}
  }
  const param = new URLSearchParams(location.search).get('sim')
  if (param) {
    const [lat, lng, accuracy] = param.split(',').map(Number)
    if (Number.isFinite(lat) && Number.isFinite(lng)) saved.fix = { lat, lng, accuracy: Number.isFinite(accuracy) ? accuracy : 10 }
  }
  if (saved.fix) setSimulatedFix(saved.fix)
  if (saved.heading !== undefined) headingStore.set((h) => ({ ...h, simulated: saved.heading }))
  if (saved.weather) testState.set((t) => ({ ...t, weather: saved.weather! }))
  if (saved.time !== undefined) clockStore.set((c) => ({ ...c, fixed: saved.time }))

  const persist = () => {
    try {
      sessionStorage.setItem(
        SESSION_KEY,
        JSON.stringify({
          fix: locationStore.get().simulated,
          heading: headingStore.get().simulated,
          time: clockStore.get().fixed,
          weather: testState.get().weather,
        } satisfies Saved),
      )
    } catch {
      // Storage blocked: the simulation just does not survive a reload.
    }
  }
  locationStore.subscribe(persist)
  headingStore.subscribe(persist)
  clockStore.subscribe(persist)
  testState.subscribe(persist)
}
