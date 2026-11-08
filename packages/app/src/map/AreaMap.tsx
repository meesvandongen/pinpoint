import { distanceMeters, formatDistance, type Fix, type Pin } from 'pinpoint-core'
import { useI18n } from '../i18n/index.ts'
import { mapTarget } from './target.ts'

/** Local metres east and north of an origin. */
function offset(from: { lat: number; lng: number }, to: { lat: number; lng: number }) {
  const mLat = 110540
  const mLng = 111320 * Math.cos((from.lat * Math.PI) / 180)
  return { x: (to.lng - from.lng) * mLng, y: (to.lat - from.lat) * mLat }
}

/**
 * A schematic map without tiles, for when the real map cannot load (no connection, no WebGL):
 * the player, and the target as a point or a loose ring. North is up.
 */
export function AreaMap({ pin, fix, view }: { pin: Pin; fix?: Fix; view: 'full' | 'area' }) {
  const { t } = useI18n()
  const target = mapTarget(pin, view)
  const origin = fix ?? target.center
  const c = offset(origin, target.center)
  const reach = Math.max(target.radius * 1.3, Math.hypot(c.x, c.y) + target.radius * 0.6, fix ? 120 : 0)
  const s = 90 / reach
  const px = (v: number) => 110 + v * s
  const py = (v: number) => 90 - v * s
  const dist = fix ? formatDistance(distanceMeters(fix, pin.position)) : undefined
  return (
    <svg viewBox="0 0 220 180" className="areamap" role="img" aria-label={view === 'area' ? t('play.areaMap') : t('play.pinMap')}>
      <rect width="220" height="180" rx="10" fill="var(--map-bg)" />
      <g stroke="var(--map-line)" strokeWidth="1" opacity=".7">
        <path d="M0 60H220M0 120H220M73 0V180M147 0V180" />
      </g>
      <text x="206" y="16" textAnchor="end" className="map-n">N</text>
      <circle
        cx={px(c.x)} cy={py(c.y)} r={Math.max(6, target.radius * s)}
        fill="var(--map-ring)" stroke="var(--map-pin)" strokeWidth="2.5" strokeDasharray={view === 'area' ? '6 5' : undefined}
      />
      {view === 'full' && <circle cx={px(c.x)} cy={py(c.y)} r="4" fill="var(--map-pin)" />}
      {fix && (
        <>
          <circle cx={px(0)} cy={py(0)} r="9" fill="var(--map-you)" opacity=".2" />
          <circle cx={px(0)} cy={py(0)} r="5" fill="var(--map-you)" stroke="#fff" strokeWidth="2" />
        </>
      )}
      {dist && <text x="10" y="170" className="map-n">{`${t('play.mapYou')} · ${t('play.mapTarget', { distance: dist })}`}</text>}
    </svg>
  )
}
