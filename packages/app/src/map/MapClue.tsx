import { Component, lazy, Suspense, useState, type ReactNode } from 'react'
import type { Fix, Pin, Position } from 'pinpoint-core'
import { useI18n } from '../i18n/index.ts'
import { AreaMap } from './AreaMap.tsx'
import { mapTarget, webglSupported } from './target.ts'

const MapView = lazy(() => import('./MapView.tsx'))

/** Falls back to the schematic map when the map chunk cannot be loaded, such as offline on a first visit. */
class Fallback extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

export function MapClue({
  pin,
  fix,
  view,
  markers,
  onPick,
}: {
  pin: Pin
  fix?: Fix
  view: 'full' | 'area'
  markers?: Position[]
  onPick?: (position: Position) => void
}) {
  const { t } = useI18n()
  const [failed, setFailed] = useState(false)
  const schematic = <AreaMap pin={pin} fix={fix} view={view} />
  if (failed || !webglSupported()) return schematic
  return (
    <Fallback fallback={schematic}>
      <Suspense fallback={schematic}>
        <MapView
          target={mapTarget(pin, view)}
          you={fix}
          markers={markers}
          onPick={onPick}
          onUnavailable={() => setFailed(true)}
          label={view === 'area' ? t('play.areaMap') : t('play.pinMap')}
        />
      </Suspense>
    </Fallback>
  )
}
