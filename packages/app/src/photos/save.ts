import { createStore, useStore } from '../lib/store.ts'
import { photoKey, putPhoto } from './db.ts'
import { downscaleImage } from './resize.ts'

/**
 * Photos that were just taken and are still being shrunk and stored, as object URLs of the camera file. The
 * game shows these at once, so taking a photo never waits on the phone decoding a twelve-megapixel image.
 */
const pending = createStore<Record<string, string>>({})

/** The photo of a pin that is still being saved, if any. */
export const usePendingPhoto = (questId: string, pinId: string) => useStore(pending, (all) => all[photoKey(questId, pinId)])

/** Every photo of a quest that is still being saved, by pin id. */
export function pendingPhotos(all: Record<string, string>, questId: string): Record<string, string> {
  const prefix = `${questId}/`
  return Object.fromEntries(Object.entries(all).filter(([key]) => key.startsWith(prefix)).map(([key, url]) => [key.slice(prefix.length), url]))
}
export const usePendingPhotos = () => useStore(pending)

const forget = (key: string, url: string) => {
  pending.set((all) => {
    if (all[key] !== url) return all
    const { [key]: _, ...rest } = all
    return rest
  })
  // The stored copy takes over; give the views a moment to load it before the camera file goes.
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}

/** Shows the photo right away, then shrinks and stores it. A newer photo of the same pin wins. */
export async function savePhoto(questId: string, pinId: string, file: Blob): Promise<void> {
  const key = photoKey(questId, pinId)
  const url = URL.createObjectURL(file)
  pending.set((all) => ({ ...all, [key]: url }))
  try {
    const { blob, width, height } = await downscaleImage(file)
    if (pending.get()[key] !== url) return
    await putPhoto({ questId, pinId, blob, width, height, at: new Date().toISOString() })
  } finally {
    forget(key, url)
  }
}
