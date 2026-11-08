import { TanStackDevtools } from '@tanstack/react-devtools'
import { ReactQueryDevtoolsPanel } from '@tanstack/react-query-devtools/production'
import { useRouter } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanelInProd } from '@tanstack/react-router-devtools'
import { LocationPanel, MocksPanel, ProgressPanel, TimePanel } from './panels.tsx'
import './panels.css'

/**
 * The TanStack Devtools shell with Pinpoint's own panels next to the Query and Router ones. Testers
 * use it on preview deployments to stand anywhere, change the time of day and the weather, and see
 * what the mocks answered. Only dev and preview builds contain it.
 */
export default function TestTools() {
  const router = useRouter()
  return (
    <TanStackDevtools
      config={{ position: 'middle-right', defaultOpen: false }}
      plugins={[
        { id: 'pinpoint-location', name: 'Location', render: <LocationPanel /> },
        { id: 'pinpoint-time', name: 'Time and weather', render: <TimePanel /> },
        { id: 'pinpoint-progress', name: 'Progress', render: <ProgressPanel /> },
        { id: 'pinpoint-mocks', name: 'Mocks', render: <MocksPanel /> },
        { id: 'query', name: 'Query', render: <ReactQueryDevtoolsPanel style={{ height: '100%' }} /> },
        { id: 'router', name: 'Router', render: <TanStackRouterDevtoolsPanelInProd router={router} /> },
      ]}
    />
  )
}
