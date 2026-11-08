import { hashString } from './stamp-style.ts'

export type CollageSlot = {
  /** Centre of the polaroid. */
  x: number
  y: number
  width: number
  height: number
  /** Degrees, clockwise. */
  rotation: number
}

export type CollageOptions = {
  width: number
  height: number
  /** Space kept free above the photos, for a title. */
  top: number
  /** Space kept free below the photos, for stamps. */
  bottom: number
  margin: number
  /** Makes the small tilts reproducible. */
  seed: string
}

/** Width over height of a polaroid frame. */
export const POLAROID_ASPECT = 0.84

function random(seed: number) {
  // mulberry32
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Places `count` polaroids on a canvas: the grid that gives them the most room, an incomplete last
 * row centred, each with a small tilt and shift so it looks laid down by hand.
 */
export function collageLayout(count: number, options: CollageOptions): CollageSlot[] {
  if (count <= 0) return []
  const areaW = options.width - 2 * options.margin
  const areaH = options.height - options.top - options.bottom
  let best = { rows: 1, cols: count, size: 0 }
  for (let rows = 1; rows <= count; rows++) {
    const cols = Math.ceil(count / rows)
    const size = Math.min(areaW / cols, (areaH / rows) * POLAROID_ASPECT)
    if (size > best.size) best = { rows, cols, size }
  }
  const width = Math.min(best.size * 0.86, areaW * 0.62)
  const height = width / POLAROID_ASPECT
  const cellW = areaW / best.cols
  const cellH = areaH / best.rows
  const rand = random(hashString(options.seed))
  const slots: CollageSlot[] = []
  for (let i = 0; i < count; i++) {
    const row = Math.floor(i / best.cols)
    const inRow = row === best.rows - 1 ? count - row * best.cols : best.cols
    const col = i - row * best.cols
    const rowOffset = ((best.cols - inRow) * cellW) / 2
    const slackX = Math.max(0, (cellW - width) / 3)
    const slackY = Math.max(0, (cellH - height) / 3)
    slots.push({
      x: options.margin + rowOffset + cellW * (col + 0.5) + (rand() - 0.5) * 2 * slackX,
      y: options.top + cellH * (row + 0.5) + (rand() - 0.5) * 2 * slackY,
      width,
      height,
      rotation: (rand() - 0.5) * 9,
    })
  }
  return slots
}
