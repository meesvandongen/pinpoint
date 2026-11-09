import { fitWithin, MAX_EDGE, QUALITY, downscaleOffscreen, type Downscaled } from './shrink.ts'

export { fitWithin }

/** The same with a plain canvas, for browsers without OffscreenCanvas. */
async function downscaleOnPage(file: Blob, maxEdge = MAX_EDGE, quality = QUALITY): Promise<Downscaled> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  try {
    const { width, height } = fitWithin(bitmap.width, bitmap.height, maxEdge)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) throw new Error('This browser cannot draw images')
    context.drawImage(bitmap, 0, 0, width, height)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
    if (!blob) throw new Error('The photo could not be encoded')
    return { blob, width, height }
  } finally {
    bitmap.close()
  }
}

let worker: Worker | undefined
let nextId = 0
const waiting = new Map<number, { resolve: (d: Downscaled) => void; reject: (e: Error) => void }>()

function photoWorker(): Worker {
  if (worker) return worker
  const created = new Worker(new URL('./resize.worker.ts', import.meta.url), { type: 'module' })
  created.onmessage = (event: MessageEvent<{ id: number; result?: Downscaled; error?: string }>) => {
    const job = waiting.get(event.data.id)
    if (!job) return
    waiting.delete(event.data.id)
    if (event.data.result) job.resolve(event.data.result)
    else job.reject(new Error(event.data.error ?? 'The photo could not be processed'))
  }
  // A worker that cannot start (offline before it was ever cached, say) fails every job, and is not used again.
  created.onerror = () => {
    for (const job of waiting.values()) job.reject(new Error('The photo worker stopped'))
    waiting.clear()
    worker = undefined
    broken = true
  }
  worker = created
  return created
}

let broken = false

function inWorker(file: Blob): Promise<Downscaled> {
  return new Promise((resolve, reject) => {
    const id = nextId++
    waiting.set(id, { resolve, reject })
    photoWorker().postMessage({ id, file })
  })
}

/**
 * Shrinks a camera photo before it is stored: phone cameras produce several megabytes, and a game album
 * needs a fraction of that. Done in a worker where possible, so the page stays smooth while it works.
 */
export async function downscaleImage(file: Blob): Promise<Downscaled> {
  if (!broken && typeof Worker !== 'undefined' && typeof OffscreenCanvas !== 'undefined') {
    try {
      return await inWorker(file)
    } catch {
      // Fall through to the page.
    }
  }
  return typeof OffscreenCanvas !== 'undefined' ? downscaleOffscreen(file) : downscaleOnPage(file)
}
