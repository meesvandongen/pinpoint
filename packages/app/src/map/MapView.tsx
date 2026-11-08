import 'maplibre-gl/dist/maplibre-gl.css'
import { useEffect, useRef } from 'react'
import { Map as MapLibre, setWorkerUrl, type GeoJSONSource, type LngLatBoundsLike } from 'maplibre-gl'
// The library looks for its worker next to itself, which breaks once a bundler moves it, so say where it is.
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import { bounds, circleRing, type Position } from 'pinpoint-core'
import { passportStyle } from './style.ts'
import { framePoints, type MapTarget } from './target.ts'

setWorkerUrl(new URL(workerUrl, location.href).href)

export type MapViewProps = {
  target: MapTarget
  you?: Position
  /** Other positions to mark, such as every pin of the quest in the test tools. */
  markers?: Position[]
  /** Makes the map respond to taps; the test tools use it to place the player. */
  onPick?: (position: Position) => void
  /** Called when the map cannot load, so the caller can show something simpler. */
  onUnavailable?: () => void
  label: string
}

const point = (p: Position) => ({
  type: 'Feature' as const,
  properties: {},
  geometry: { type: 'Point' as const, coordinates: [p.lng, p.lat] },
})
const collection = (features: ReturnType<typeof point>[]) => ({ type: 'FeatureCollection' as const, features })
const ring = (r: Position[]) => ({
  type: 'Feature' as const,
  properties: {},
  geometry: { type: 'Polygon' as const, coordinates: [[...r, r[0]].map((p) => [p.lng, p.lat])] },
})

function frame(target: MapTarget, you?: Position): LngLatBoundsLike {
  const [w, s, e, n] = bounds(framePoints(target, you))
  return [[w, s], [e, n]]
}

/** The real map, in the passport palette. Loaded on demand because the map library is large. */
export default function MapView({ target, you, markers, onPick, onUnavailable, label }: MapViewProps) {
  const container = useRef<HTMLDivElement>(null)
  const map = useRef<MapLibre | null>(null)
  const ready = useRef(false)
  const latest = useRef({ target, you, markers, onPick, onUnavailable })
  latest.current = { target, you, markers, onPick, onUnavailable }

  useEffect(() => {
    if (!container.current) return
    const { target: first, you: youFirst } = latest.current
    let loaded = false
    let instance: MapLibre
    try {
      instance = new MapLibre({
        container: container.current,
        style: passportStyle(),
        bounds: frame(first, youFirst),
        fitBoundsOptions: { padding: 36, maxZoom: 17.5 },
        maxZoom: 19.5,
        attributionControl: { compact: true },
        dragRotate: false,
        pitchWithRotate: false,
        cooperativeGestures: false,
      })
    } catch {
      latest.current.onUnavailable?.()
      return
    }
    map.current = instance
    instance.touchZoomRotate.disableRotation()

    const fail = () => {
      if (!loaded) latest.current.onUnavailable?.()
    }
    const timeout = setTimeout(fail, 12000)
    instance.on('error', fail)

    instance.on('load', () => {
      loaded = true
      ready.current = true
      clearTimeout(timeout)
      const { target: t, you: y, markers: m } = latest.current
      instance.addSource('area', { type: 'geojson', data: ring(circleRing(t.center, t.radius)) })
      instance.addSource('center', { type: 'geojson', data: collection(t.mode === 'pin' ? [point(t.center)] : []) })
      instance.addSource('markers', { type: 'geojson', data: collection((m ?? []).map(point)) })
      instance.addSource('you', { type: 'geojson', data: collection(y ? [point(y)] : []) })
      instance.addLayer({ id: 'area-fill', type: 'fill', source: 'area', paint: { 'fill-color': '#d9611f', 'fill-opacity': 0.16 } })
      instance.addLayer({
        id: 'area-line', type: 'line', source: 'area',
        paint: { 'line-color': '#d9611f', 'line-width': 2.5, ...(t.mode === 'area' ? { 'line-dasharray': [2, 1.5] } : {}) },
      })
      instance.addLayer({ id: 'markers', type: 'circle', source: 'markers', paint: { 'circle-radius': 5, 'circle-color': '#fffaf0', 'circle-stroke-color': '#2b2a26', 'circle-stroke-width': 2 } })
      instance.addLayer({ id: 'center', type: 'circle', source: 'center', paint: { 'circle-radius': 6, 'circle-color': '#d9611f', 'circle-stroke-color': '#fffaf0', 'circle-stroke-width': 2 } })
      instance.addLayer({ id: 'you-halo', type: 'circle', source: 'you', paint: { 'circle-radius': 15, 'circle-color': '#2a5bd7', 'circle-opacity': 0.2 } })
      instance.addLayer({ id: 'you', type: 'circle', source: 'you', paint: { 'circle-radius': 7, 'circle-color': '#2a5bd7', 'circle-stroke-color': '#fff', 'circle-stroke-width': 3 } })
    })

    instance.on('click', (e) => latest.current.onPick?.({ lat: e.lngLat.lat, lng: e.lngLat.lng }))

    return () => {
      clearTimeout(timeout)
      ready.current = false
      instance.remove()
      map.current = null
    }
  }, [])

  // Keep the drawn data in step with the props.
  useEffect(() => {
    const instance = map.current
    if (!instance || !ready.current) return
    const set = (id: string, data: object) => void (instance.getSource(id) as GeoJSONSource | undefined)?.setData(data as never)
    set('area', ring(circleRing(target.center, target.radius)))
    set('center', collection(target.mode === 'pin' ? [point(target.center)] : []))
    set('markers', collection((markers ?? []).map(point)))
    set('you', collection(you ? [point(you)] : []))
  }, [target, you, markers])

  // Show everything when the target changes, or the player appears for the first time.
  const framed = useRef('')
  useEffect(() => {
    const instance = map.current
    const key = `${target.center.lat},${target.center.lng},${target.radius},${you ? 'you' : 'no'}`
    if (!instance || framed.current === key) return
    if (framed.current === '' ) {
      framed.current = key
      return
    }
    framed.current = key
    instance.fitBounds(frame(target, you), { padding: 36, maxZoom: 17.5, duration: 0 })
  }, [target, you])

  return <div ref={container} className="mapview" role="img" aria-label={label} />
}
