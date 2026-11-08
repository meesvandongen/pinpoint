import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { createAppRouter } from './router.tsx'
import { listenForInstall } from './state/install.ts'
import { registerServiceWorker } from './sw-register.ts'
import { TEST_TOOLS } from './testing/flag.ts'
import './styles.css'

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } } })
const router = createAppRouter(queryClient)

async function start() {
  // In dev and preview builds the mock service worker answers requests such as the weather and
  // the GitHub API, so testers need no accounts. It has to be running before the first request.
  if (TEST_TOOLS) {
    const { startTestTools } = await import('./testing/setup.ts')
    await startTestTools({ queryClient, router })
  } else {
    registerServiceWorker()
  }
  listenForInstall()
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </StrictMode>,
  )
}

void start()
