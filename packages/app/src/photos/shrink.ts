/** The size that fits within `maxEdge` on the longer side, never enlarging. */
export function fitWithin(width: number, height: number, maxEdge: number) {
  const scale = Math.min(1, maxEdge / Math.max(width, height))
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) }
}

export type Downscaled = { blob: Blob; width: number; height: number }

/**
 * Big enough for the album, the book and the collage, whose largest photo is about 900 pixels wide. Every
 * pixel less is time saved on a phone, where decoding and encoding a camera photo is the slow part.
 */
export const MAX_EDGE = 1280
export const QUALITY = 0.82

/**
 * Shrinks a camera photo with an OffscreenCanvas. Runs in the photo worker, and on the page when the worker cannot. EXIF rotation is applied, so the result is always upright.
 */
export async function downscaleOffscreen(file: Blob, maxEdge = MAX_EDGE, quality = QUALITY): Promise<Downscaled> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  try {
    const { width, height } = fitWithin(bitmap.width, bitmap.height, maxEdge)
    const canvas = new OffscreenCanvas(width, height)
    const context = canvas.getContext('2d')
    if (!context) throw new Error('This browser cannot draw images')
    context.drawImage(bitmap, 0, 0, width, height)
    const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality })
    return { blob, width, height }
  } finally {
    bitmap.close()
  }
}

