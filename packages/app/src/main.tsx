import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { createAppRouter } from './router.tsx'
import { listenForInstall } from './state/install.ts'
import { resumeIfGranted } from './state/location.ts'
import { registerServiceWorker } from './sw-register.ts'
// Fonts are bundled, not loaded from Google: they work offline, load faster, and nobody is told you play Pinpoint.
import '@fontsource/courier-prime/latin-400.css'
import '@fontsource/courier-prime/latin-700.css'
import '@fontsource/caveat/latin-600.css'
import '@fontsource/newsreader/latin-400.css'
import '@fontsource/newsreader/latin-400-italic.css'
import '@fontsource/dm-sans/latin-400.css'
import '@fontsource/dm-sans/latin-600.css'
import '@fontsource/dm-sans/latin-700.css'
import './styles.css'

// A deploy replaces the files an open tab still wants to load; a reload picks up the new ones.
window.addEventListener('vite:preloadError', () => location.reload())

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } } })
const router = createAppRouter(queryClient)

async function start() {
  // In dev and preview builds the mock service worker answers requests such as the weather and
  // the GitHub API, so testers need no accounts. It has to be running before the first request.
  if (__TEST_TOOLS__) {
    const { startTestTools } = await import('./testing/setup.ts')
    await startTestTools({ queryClient, router })
  } else {
    registerServiceWorker()
  }
  listenForInstall()
  void resumeIfGranted()
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </StrictMode>,
  )
}

void start()
