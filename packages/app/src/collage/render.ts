import { collageLayout, POLAROID_ASPECT } from 'pinpoint-core'

export const COLLAGE_SIZE = { width: 1080, height: 1350 } as const

export type CollagePhoto = { blob: Blob; caption: string }

export type CollageInput = {
  /** Quest title, shown at the top. */
  title: string
  /** A line under the title, such as the date. */
  subtitle: string
  photos: CollagePhoto[]
  /** Stamps as SVG strings, drawn in a row at the bottom. */
  stamps: string[]
  /** Makes the tilts reproducible. */
  seed: string
}

const NAVY = '#1f2a44'
const GOLD = '#e9c46a'
const PAPER = '#f3ecd8'
const INK = '#2b2a26'
const FONT = '"Courier Prime", ui-monospace, monospace'

async function svgImage(svg: string): Promise<HTMLImageElement> {
  const image = new Image()
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  await image.decode()
  return image
}

/** Draws `image` into the box, cropping the overflow like CSS `object-fit: cover`. */
function drawCover(ctx: CanvasRenderingContext2D, image: ImageBitmap, x: number, y: number, w: number, h: number) {
  const scale = Math.max(w / image.width, h / image.height)
  const sw = w / scale
  const sh = h / scale
  ctx.drawImage(image, (image.width - sw) / 2, (image.height - sh) / 2, sw, sh, x, y, w, h)
}

function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  if (ctx.measureText(text).width <= maxWidth) return text
  let clipped = text
  while (clipped.length > 1 && ctx.measureText(`${clipped}…`).width > maxWidth) clipped = clipped.slice(0, -1)
  return `${clipped}…`
}

/** Renders the end-of-quest collage: photos as polaroids on the navy cover, stamps along the bottom. */
export async function renderCollage(input: CollageInput): Promise<Blob> {
  const { width, height } = COLLAGE_SIZE
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('This browser cannot draw images')

  await document.fonts?.load(`700 40px ${FONT}`).catch(() => undefined)

  ctx.fillStyle = NAVY
  ctx.fillRect(0, 0, width, height)

  // Title
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = GOLD
  ctx.font = `700 30px ${FONT}`
  ctx.letterSpacing = '10px'
  ctx.fillText('PINPOINT', width / 2, 84)
  ctx.letterSpacing = '4px'
  ctx.fillStyle = PAPER
  ctx.font = `700 58px ${FONT}`
  ctx.fillText(fitText(ctx, input.title.toUpperCase(), width - 120), width / 2, 150)
  ctx.letterSpacing = '2px'
  ctx.fillStyle = '#c8b57a'
  ctx.font = `400 28px ${FONT}`
  ctx.fillText(input.subtitle, width / 2, 192)
  ctx.letterSpacing = '0px'

  // Photos
  const bitmaps = await Promise.all(input.photos.map((p) => createImageBitmap(p.blob, { imageOrientation: 'from-image' })))
  try {
    const slots = collageLayout(bitmaps.length, { width, height, top: 230, bottom: 210, margin: 60, seed: input.seed })
    slots.forEach((slot, i) => {
      ctx.save()
      ctx.translate(slot.x, slot.y)
      ctx.rotate((slot.rotation * Math.PI) / 180)
      ctx.shadowColor = 'rgba(0,0,0,0.45)'
      ctx.shadowBlur = 24
      ctx.shadowOffsetY = 10
      ctx.fillStyle = PAPER
      ctx.fillRect(-slot.width / 2, -slot.height / 2, slot.width, slot.height)
      ctx.shadowColor = 'transparent'
      const edge = slot.width * 0.07
      const photoW = slot.width - 2 * edge
      const photoH = Math.min(photoW, slot.height - edge * 2 - slot.width * 0.16)
      ctx.save()
      ctx.beginPath()
      ctx.rect(-slot.width / 2 + edge, -slot.height / 2 + edge, photoW, photoH)
      ctx.clip()
      drawCover(ctx, bitmaps[i], -slot.width / 2 + edge, -slot.height / 2 + edge, photoW, photoH)
      ctx.restore()
      ctx.fillStyle = INK
      ctx.font = `700 ${Math.max(14, Math.round(slot.width * 0.075))}px ${FONT}`
      ctx.textAlign = 'center'
      ctx.fillText(
        fitText(ctx, input.photos[i].caption, photoW),
        0,
        -slot.height / 2 + edge + photoH + (slot.height - edge * 2 - photoH) * 0.62,
      )
      ctx.restore()
    })
  } finally {
    bitmaps.forEach((b) => b.close())
  }

  // Stamps along the bottom, on a paper strip
  if (input.stamps.length > 0) {
    const images = await Promise.all(input.stamps.map(svgImage))
    const stripH = 170
    const y = height - stripH - 24
    ctx.fillStyle = PAPER
    ctx.beginPath()
    ctx.roundRect(40, y, width - 80, stripH, 18)
    ctx.fill()
    const size = Math.min(stripH - 20, (width - 120) / images.length)
    const total = size * images.length
    images.forEach((image, i) => ctx.drawImage(image, (width - total) / 2 + i * size, y + (stripH - size) / 2, size, size))
  }

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
  if (!blob) throw new Error('The collage could not be encoded')
  return blob
}

export { POLAROID_ASPECT }
