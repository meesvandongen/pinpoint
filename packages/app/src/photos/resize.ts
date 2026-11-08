/** The size that fits within `maxEdge` on the longer side, never enlarging. */
export function fitWithin(width: number, height: number, maxEdge: number) {
  const scale = Math.min(1, maxEdge / Math.max(width, height))
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) }
}

/**
 * Shrinks a camera photo before it is stored: phone cameras produce several megabytes, and a
 * game album needs a fraction of that. EXIF rotation is applied, so the result is always upright.
 */
export async function downscaleImage(file: Blob, maxEdge = 1600, quality = 0.85) {
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
