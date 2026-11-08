import { createStore, useStore } from '../lib/store.ts'

export type HeadingState = {
  /** Compass heading in degrees clockwise from north, from the device. */
  device?: number
  /** A heading set by the test tools. */
  simulated?: number
  enabled: boolean
}

export const headingStore = createStore<HeadingState>({ enabled: false })

export const useHeading = () => useStore(headingStore, (h) => h.simulated ?? h.device)
export const useCompassEnabled = () => useStore(headingStore, (h) => h.enabled || h.simulated !== undefined)

type IOSOrientationEvent = DeviceOrientationEvent & { webkitCompassHeading?: number }
type PermissionedEvent = { requestPermission?: () => Promise<'granted' | 'denied'> }

function onOrientation(e: Event) {
  const o = e as IOSOrientationEvent
  if (typeof o.webkitCompassHeading === 'number') headingStore.set((h) => ({ ...h, device: o.webkitCompassHeading }))
  else if (o.absolute && typeof o.alpha === 'number') headingStore.set((h) => ({ ...h, device: (360 - o.alpha!) % 360 }))
}

/** Starts the compass. iOS asks for permission, and only from a tap. */
export async function enableCompass(): Promise<boolean> {
  const ctor = (globalThis as { DeviceOrientationEvent?: PermissionedEvent }).DeviceOrientationEvent
  if (ctor?.requestPermission && (await ctor.requestPermission()) !== 'granted') return false
  window.addEventListener('deviceorientationabsolute', onOrientation)
  window.addEventListener('deviceorientation', onOrientation)
  headingStore.set((h) => ({ ...h, enabled: true }))
  return true
}

export function setSimulatedHeading(heading: number | undefined) {
  headingStore.set((h) => ({ ...h, simulated: heading }))
}
