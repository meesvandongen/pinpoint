import { useCallback, useEffect, useState } from 'react'

type IOSOrientationEvent = DeviceOrientationEvent & { webkitCompassHeading?: number }
type PermissionedEvent = { requestPermission?: () => Promise<'granted' | 'denied'> }

/** Compass heading in degrees clockwise from north, once the player allowed it. Undefined when unavailable. */
export function useHeading() {
  const [on, setOn] = useState(false)
  const [heading, setHeading] = useState<number>()

  useEffect(() => {
    if (!on) return
    const handler = (e: Event) => {
      const o = e as IOSOrientationEvent
      if (typeof o.webkitCompassHeading === 'number') setHeading(o.webkitCompassHeading)
      else if (o.absolute && typeof o.alpha === 'number') setHeading((360 - o.alpha) % 360)
    }
    window.addEventListener('deviceorientationabsolute', handler)
    window.addEventListener('deviceorientation', handler)
    return () => {
      window.removeEventListener('deviceorientationabsolute', handler)
      window.removeEventListener('deviceorientation', handler)
    }
  }, [on])

  /** iOS asks for permission, and only from a tap. */
  const request = useCallback(async () => {
    const ctor = (globalThis as { DeviceOrientationEvent?: PermissionedEvent }).DeviceOrientationEvent
    if (ctor?.requestPermission) {
      if ((await ctor.requestPermission()) !== 'granted') return
    }
    setOn(true)
  }, [])

  return { heading, enabled: on, request }
}
