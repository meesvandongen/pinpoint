import { distanceMeters, type Fix, type Pin } from 'pinpoint-core'

/** Local metres east and north of an origin. */
function offset(from: { lat: number; lng: number }, to: { lat: number; lng: number }) {
  const mLat = 110540
  const mLng = 111320 * Math.cos((from.lat * Math.PI) / 180)
  return { x: (to.lng - from.lng) * mLng, y: (to.lat - from.lat) * mLat }
}

/**
 * A schematic map without tiles: you, and the target as a point (`full`) or a loose ring (`area`).
 * North is up. Real map tiles are a later decision.
 */
export function AreaMap({ pin, fix, view }: { pin: Pin; fix?: Fix; view: 'full' | 'area' }) {
  const target = offset(fix ?? pin.position, pin.position)
  const you = fix ? { x: 0, y: 0 } : undefined
  // The ring is deliberately off-centre so it does not give the exact spot away.
  const seed = pin.id.length * 37
  const ringShift = view === 'area' ? { x: ((seed % 9) - 4) * 18, y: ((seed % 7) - 3) * 18 } : { x: 0, y: 0 }
  const ringR = view === 'area' ? 220 : pin.radius
  const cx = target.x + ringShift.x
  const cy = target.y + ringShift.y
  const reach = Math.max(ringR * 1.3, Math.hypot(cx, cy) + ringR * 0.6, you ? 120 : 0)
  const s = 90 / reach
  const px = (v: number) => 110 + v * s
  const py = (v: number) => 90 - v * s
  const dist = fix ? Math.round(distanceMeters(fix, pin.position)) : undefined
  return (
    <svg viewBox="0 0 220 180" className="areamap" role="img" aria-label={view === 'area' ? 'Rough area of the pin' : 'Map with the pin'}>
      <rect width="220" height="180" rx="10" fill="var(--map-bg)" />
      <g stroke="var(--map-line)" strokeWidth="1" opacity=".7">
        <path d="M0 60H220M0 120H220M73 0V180M147 0V180" />
      </g>
      <text x="206" y="16" textAnchor="end" className="map-n">N</text>
      <circle cx={px(cx)} cy={py(cy)} r={Math.max(6, ringR * s)} fill="var(--map-ring)" stroke="var(--map-pin)" strokeWidth="2.5" strokeDasharray={view === 'area' ? '6 5' : undefined} />
      {view === 'full' && <circle cx={px(cx)} cy={py(cy)} r="4" fill="var(--map-pin)" />}
      {you && (
        <>
          <circle cx={px(0)} cy={py(0)} r="9" fill="var(--map-you)" opacity=".2" />
          <circle cx={px(0)} cy={py(0)} r="5" fill="var(--map-you)" stroke="#fff" strokeWidth="2" />
        </>
      )}
      {dist !== undefined && <text x="10" y="170" className="map-n">you · target {dist} m</text>}
    </svg>
  )
}
