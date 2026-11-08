import { lazy, Suspense } from 'react'
import type { QueryClient } from '@tanstack/react-query'
import {
  createRootRouteWithContext,
  createRoute,
  createRouter,
  Outlet,
} from '@tanstack/react-router'
import { contentQuery } from './content.ts'
import { Arrival } from './screens/Arrival.tsx'
import { BookIndex, BookPin, BookQuest } from './screens/Book.tsx'
import { Done } from './screens/Done.tsx'
import { Home } from './screens/Home.tsx'
import { Loading, LoadError, NotFound } from './screens/NotFound.tsx'
import { Play } from './screens/Play.tsx'
import { Quests } from './screens/Quests.tsx'
import { Settings } from './screens/Settings.tsx'

export type RouterContext = { queryClient: QueryClient }

// The test tools are a separate chunk that only exists in dev and preview builds.
const TestTools = __TEST_TOOLS__ ? lazy(() => import('./testing/TestTools.tsx')) : undefined

// The editor is a separate chunk too: players never download it.
const AdminPage = lazy(() => import('pinpoint-admin').then((m) => ({ default: m.AdminPage })))

const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: () => (
    <>
      <Outlet />
      {TestTools && (
        <Suspense fallback={null}>
          <TestTools />
        </Suspense>
      )}
    </>
  ),
  notFoundComponent: NotFound,
})

/** Everything a player sees. Content is loaded once, before any of these render. */
const appRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'app',
  loader: ({ context }) => context.queryClient.ensureQueryData(contentQuery),
  component: Outlet,
  pendingComponent: Loading,
  errorComponent: LoadError,
})

const indexRoute = createRoute({ getParentRoute: () => appRoute, path: '/', component: Home })
const placeRoute = createRoute({ getParentRoute: () => appRoute, path: '/place/$locationId', component: Quests })
const questRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/quest/$questId',
  validateSearch: (search: Record<string, unknown>): { pin?: string } => ({
    pin: typeof search.pin === 'string' ? search.pin : undefined,
  }),
  component: Play,
})
const arrivedRoute = createRoute({ getParentRoute: () => appRoute, path: '/quest/$questId/arrived/$pinId', component: Arrival })
const doneRoute = createRoute({ getParentRoute: () => appRoute, path: '/quest/$questId/done', component: Done })
const bookRoute = createRoute({ getParentRoute: () => appRoute, path: '/book', component: BookIndex })
const bookQuestRoute = createRoute({ getParentRoute: () => appRoute, path: '/book/$questId', component: BookQuest })
const bookPinRoute = createRoute({ getParentRoute: () => appRoute, path: '/book/$questId/$pinId', component: BookPin })
const settingsRoute = createRoute({ getParentRoute: () => appRoute, path: '/settings', component: Settings })

const adminRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin',
  component: () => (
    <Suspense fallback={<Loading />}>
      <AdminPage mock={__TEST_TOOLS__} />
    </Suspense>
  ),
})

const routeTree = rootRoute.addChildren([
  appRoute.addChildren([
    indexRoute,
    placeRoute,
    questRoute,
    arrivedRoute,
    doneRoute,
    bookRoute,
    bookQuestRoute,
    bookPinRoute,
    settingsRoute,
  ]),
  adminRoute,
])

export function createAppRouter(queryClient: QueryClient) {
  return createRouter({
    routeTree,
    context: { queryClient },
    defaultPreloadStaleTime: 0,
    defaultPendingMs: 300,
    scrollRestoration: false,
  })
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createAppRouter>
  }
}
