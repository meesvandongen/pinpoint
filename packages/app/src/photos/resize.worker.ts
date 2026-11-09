/// <reference lib="webworker" />
import { downscaleOffscreen } from './shrink.ts'

// Decodes and shrinks camera photos away from the page, which would otherwise freeze while it works.
self.onmessage = async (event: MessageEvent<{ id: number; file: Blob }>) => {
  const { id, file } = event.data
  try {
    const result = await downscaleOffscreen(file)
    ;(self as unknown as Worker).postMessage({ id, result })
  } catch (error) {
    ;(self as unknown as Worker).postMessage({ id, error: error instanceof Error ? error.message : String(error) })
  }
}
