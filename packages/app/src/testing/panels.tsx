import { lazy, Suspense, useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  bearingDegrees,
  destinationPoint,
  distanceMeters,
  moveToward,
  skyAt,
  type Position,
  type Sky,
} from 'pinpoint-core'
import { contentQuery } from '../content.ts'
import { clockStore } from '../lib/clock.ts'
import { useStore } from '../lib/store.ts'
import { headingStore, setSimulatedHeading } from '../state/heading.ts'
import { currentFix, locationStore, setSimulatedFix, startWatching, useLocationState } from '../state/location.ts'
import { playContext } from '../state/play-context.ts'
import { addStamp, progressStore, resetProgress } from '../state/progress.ts'
import { updateSettings, useSettings } from '../state/settings.ts'
import { clearPhotos } from '../photos/db.ts'
import { webglSupported } from '../map/target.ts'
import { useBridge, useTestState, testState, type MockWeather } from './bridge.ts'
import { momentWithSky } from './sky.ts'

const MapView = lazy(() => import('../map/MapView.tsx'))

const DEFAULT_PLACE: Position = { lat: 51.5607, lng: 5.0768 }
const centroid = (ring: Position[]): Position => ({
  lat: ring.reduce((s, p) => s + p.lat, 0) / ring.length,
  lng: ring.reduce((s, p) => s + p.lng, 0) / ring.length,
})

export function LocationPanel() {
  const loc = useLocationState()
  const play = useStore(playContext)
  const heading = useStore(headingStore)
  const { data: content } = useQuery(contentQuery)
  const fix = currentFix(loc)
  const simulating = loc.simulated !== undefined
  const pin = play.pin
  const [accuracy, setAccuracy] = useState(10)
  const [bearing, setBearing] = useState(180)
  const [speed, setSpeed] = useState(1.4)
  const [walking, setWalking] = useState(false)

  const place = (p: Position, acc = accuracy) => setSimulatedFix({ lat: p.lat, lng: p.lng, accuracy: acc })

  useEffect(() => {
    if (!walking || !pin) return
    const id = setInterval(() => {
      const current = currentFix(locationStore.get())
      if (current) setSimulatedFix({ ...moveToward(current, pin.position, speed), accuracy: current.accuracy })
    }, 1000)
    return () => clearInterval(id)
  }, [walking, pin, speed])

  const startWalking = () => {
    if (pin && !fix) place(destinationPoint(pin.position, 300, bearing))
    setWalking(true)
  }

  return (
    <div className="pp-panel">
      <div>
        <h3>Position source</h3>
        <div className="pp-row">
          <button className={!simulating ? 'on' : ''} onClick={() => { setWalking(false); setSimulatedFix(undefined); startWatching() }}>
            Device GPS
          </button>
          <button className={simulating ? 'on' : ''} onClick={() => place(fix ?? pin?.position ?? DEFAULT_PLACE)}>
            Simulated
          </button>
          <span className="pp-muted">
            {fix ? `${fix.lat.toFixed(5)}, ${fix.lng.toFixed(5)} (±${Math.round(fix.accuracy)} m)` : 'no position yet'}
          </span>
        </div>
      </div>

      <div>
        <h3>Set position</h3>
        <div className="pp-row">
          <label>lat <input type="number" step="0.0001" value={fix?.lat.toFixed(5) ?? ''} onChange={(e) => fix && place({ lat: Number(e.target.value), lng: fix.lng })} /></label>
          <label>lng <input type="number" step="0.0001" value={fix?.lng.toFixed(5) ?? ''} onChange={(e) => fix && place({ lat: fix.lat, lng: Number(e.target.value) })} /></label>
          <label>accuracy
            <select value={accuracy} onChange={(e) => { const a = Number(e.target.value); setAccuracy(a); if (fix && simulating) place(fix, a) }}>
              {[5, 10, 30, 60, 120].map((a) => <option key={a} value={a}>±{a} m</option>)}
            </select>
          </label>
        </div>
      </div>

      {content && (
        <div>
          <h3>Jump to a place</h3>
          <div className="pp-row">
            {content.locations.map((l) => (
              <button key={l.id} onClick={() => place(centroid(l.polygon))}>{typeof l.name === 'string' ? l.name : (l.name.en ?? Object.values(l.name)[0])}</button>
            ))}
            <button onClick={() => place({ lat: 52.3731, lng: 4.8922 })}>Amsterdam (no quests)</button>
          </div>
        </div>
      )}

      <div>
        <h3>{pin ? `Around the pin "${typeof pin.title === 'string' ? pin.title : (pin.title.en ?? Object.values(pin.title)[0])}"` : 'Around the pin (open a quest first)'}</h3>
        <div className="pp-row">
          <label>from the direction <input type="range" min="0" max="359" value={bearing} onChange={(e) => setBearing(Number(e.target.value))} /> {bearing}°</label>
        </div>
        <div className="pp-row" style={{ marginTop: 6 }}>
          {[0, 25, 80, 240, 1000].map((m) => (
            <button key={m} disabled={!pin} onClick={() => pin && place(destinationPoint(pin.position, m, bearing))}>
              {m === 0 ? 'On the pin' : m >= 1000 ? `${m / 1000} km` : `${m} m`}
            </button>
          ))}
          <button disabled={!pin} onClick={() => pin && place(destinationPoint(pin.position, 15, bearing), 120)}>Vague fix</button>
        </div>
        <div className="pp-row" style={{ marginTop: 6 }}>
          <button className={walking ? 'on' : ''} disabled={!pin} onClick={() => (walking ? setWalking(false) : startWalking())}>
            {walking ? 'Stop walking' : 'Walk to the pin'}
          </button>
          <select value={speed} onChange={(e) => setSpeed(Number(e.target.value))}>
            <option value={1.4}>walking, 1.4 m/s</option>
            <option value={5}>running, 5 m/s</option>
            <option value={20}>cycling fast, 20 m/s</option>
          </select>
          {pin && fix && <span className="pp-muted">{Math.round(distanceMeters(fix, pin.position))} m to go</span>}
        </div>
      </div>

      <div>
        <h3>Compass</h3>
        <div className="pp-row">
          <input type="range" min="0" max="359" value={heading.simulated ?? 0} onChange={(e) => setSimulatedHeading(Number(e.target.value))} />
          <span>{heading.simulated === undefined ? 'device' : `${heading.simulated}°`}</span>
          <button disabled={!pin || !fix} onClick={() => pin && fix && setSimulatedHeading(Math.round(bearingDegrees(fix, pin.position)))}>Face the pin</button>
          <button onClick={() => setSimulatedHeading(undefined)}>Use device</button>
        </div>
      </div>

      <div>
        <h3>Tap the map to move</h3>
        <div className="pp-map">
          {webglSupported() ? (
            <Suspense fallback={<span className="pp-muted">loading map…</span>}>
              <MapView
                label="Position picker"
                target={{ mode: 'pin', center: pin?.position ?? fix ?? DEFAULT_PLACE, radius: pin?.radius ?? 40 }}
                you={fix}
                markers={play.quest?.pins.map((p) => p.position)}
                onPick={(p) => place(p)}
              />
            </Suspense>
          ) : (
            <span className="pp-muted">The map needs WebGL.</span>
          )}
        </div>
      </div>
    </div>
  )
}

const SKIES: { sky: Sky; label: string }[] = [
  { sky: 'day', label: 'Day' },
  { sky: 'sunrise', label: 'Sunrise' },
  { sky: 'night', label: 'After dark' },
]

const toLocalInput = (ms: number) => {
  const d = new Date(ms)
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}

export function TimePanel() {
  const clock = useStore(clockStore)
  const test = useTestState()
  const loc = useLocationState()
  const fix = currentFix(loc) ?? DEFAULT_PLACE
  const shown = new Date(clock.fixed ?? Date.now())

  return (
    <div className="pp-panel">
      <div>
        <h3>Clock</h3>
        <div className="pp-row">
          <button className={clock.fixed === undefined ? 'on' : ''} onClick={() => clockStore.set((c) => ({ ...c, fixed: undefined }))}>Real time</button>
          <input
            type="datetime-local"
            style={{ width: 190 }}
            value={toLocalInput(clock.fixed ?? Date.now())}
            onChange={(e) => e.target.value && clockStore.set((c) => ({ ...c, fixed: new Date(e.target.value).getTime() }))}
          />
        </div>
        <div className="pp-row" style={{ marginTop: 6 }}>
          {SKIES.map(({ sky, label }) => (
            <button
              key={sky}
              onClick={() => {
                const moment = momentWithSky(shown, fix, sky)
                if (moment) clockStore.set((c) => ({ ...c, fixed: moment.getTime() }))
              }}
            >
              {label} here today
            </button>
          ))}
        </div>
        <p className="pp-muted">Sky at this moment: <code>{skyAt(shown, fix)}</code>. The night and sunrise marks use it.</p>
      </div>

      <div>
        <h3>Clue timers</h3>
        <div className="pp-row">
          <button onClick={() => clockStore.set((c) => ({ ...c, skipSeconds: c.skipSeconds + 30 }))}>+30 s</button>
          <button onClick={() => clockStore.set((c) => ({ ...c, skipSeconds: c.skipSeconds + 60 }))}>+60 s</button>
          <button onClick={() => clockStore.set((c) => ({ ...c, skipSeconds: 0 }))}>Reset</button>
          <span className="pp-muted">skipped {clock.skipSeconds} s</span>
        </div>
      </div>

      <div>
        <h3>Weather</h3>
        <div className="pp-row">
          {(['real', 'dry', 'rain'] as MockWeather[]).map((w) => (
            <button key={w} className={test.weather === w ? 'on' : ''} onClick={() => testState.set((s) => ({ ...s, weather: w }))}>
              {w === 'real' ? 'Real (Open-Meteo)' : w === 'dry' ? 'Dry' : 'Raining'}
            </button>
          ))}
        </div>
        <p className="pp-muted">The rain mark also needs “Weather marks” in the app settings.</p>
      </div>
    </div>
  )
}

export function ProgressPanel() {
  const settings = useSettings()
  const stamps = useStore(progressStore)
  const play = useStore(playContext)
  const loc = useLocationState()
  const fix = currentFix(loc)

  const stampPin = (questId: string, pinId: string) => {
    const at = new Date(clockStore.get().fixed ?? Date.now()).toISOString()
    const sky = fix ? skyAt(new Date(at), fix) : 'day'
    addStamp({ questId, pinId, at, clues: ['text', 'distance'], ...(sky !== 'day' ? { sky } : {}) })
  }

  return (
    <div className="pp-panel">
      <div>
        <h3>Stamps</h3>
        <p className="pp-muted">{stamps.length} in this browser.</p>
        <div className="pp-row">
          <button disabled={!play.pin || !play.quest} onClick={() => play.quest && play.pin && stampPin(play.quest.id, play.pin.id)}>Stamp this pin now</button>
          <button disabled={!play.quest} onClick={() => play.quest?.pins.forEach((p) => stampPin(play.quest!.id, p.id))}>Stamp every pin of this quest</button>
          <button className="danger" onClick={() => { resetProgress(); void clearPhotos() }}>Reset stamps and photos</button>
        </div>
      </div>
      <div>
        <h3>Settings</h3>
        <div className="pp-row">
          <label><input type="checkbox" checked={settings.expert} onChange={(e) => updateSettings({ expert: e.target.checked })} /> Local expert</label>
          <label><input type="checkbox" checked={settings.weatherMarks} onChange={(e) => updateSettings({ weatherMarks: e.target.checked })} /> Weather marks</label>
          <select value={settings.language} onChange={(e) => updateSettings({ language: e.target.value as 'auto' | 'en' | 'nl' })}>
            <option value="auto">Language: auto</option>
            <option value="en">Language: English</option>
            <option value="nl">Language: Nederlands</option>
          </select>
        </div>
      </div>
    </div>
  )
}

export function MocksPanel() {
  const test = useTestState()
  const { repository, resetRepository } = useBridge()
  const commits = repository?.log('main', 50).length ?? 0
  return (
    <div className="pp-panel">
      <div>
        <h3>Mock GitHub</h3>
        <p className="pp-muted">
          A copy of <code>content/</code> lives in this browser and answers as <code>meesvandongen/pinpoint</code>. Edits made in the{' '}
          <a href="/admin" style={{ color: '#e9c46a' }}>editor</a> are played straight away. {commits} commit{commits === 1 ? '' : 's'} on main.
        </p>
        <button className="danger" disabled={!resetRepository} onClick={() => void resetRepository?.()}>Reset to the content of this build</button>
      </div>
      <div>
        <h3>Requests answered by mocks</h3>
        <div className="pp-log">
          {test.requests.length === 0 && <span className="pp-muted">none yet</span>}
          {test.requests.map((r, i) => (
            <div key={`${r.at}-${i}`}>
              <span className="pp-muted">{new Date(r.at).toLocaleTimeString()}</span> {r.method} {r.url.replace(location.origin, '')}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
