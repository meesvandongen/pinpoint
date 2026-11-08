import { categoryChain, type Category } from './categories.ts'
import type { Pin, StampShape } from './schema.ts'

/** Inks that stay readable on cream paper. */
export const INKS = ['#5b34a8', '#1c7a58', '#a8302a', '#1b4a96', '#17707a', '#2b2a26', '#9a4f1a'] as const

const SHAPE_BY_CATEGORY: Partial<Record<Category, StampShape>> = {
  bridge: 'hex',
  tower: 'hex',
  castle: 'hex',
  station: 'ticket',
  theatre: 'ticket',
  harbour: 'oval',
  water: 'oval',
  park: 'oval',
  market: 'postage',
  shop: 'postage',
  food: 'postage',
  street: 'postage',
}

/** Round shows up more often than the others, as the classic seal. */
const FALLBACK_SHAPES: StampShape[] = ['round', 'round', 'hex', 'oval', 'postage', 'ticket']

export function hashString(text: string): number {
  let h = 0
  for (const ch of text) h = (h * 31 + ch.charCodeAt(0)) | 0
  return Math.abs(h)
}

export type ResolvedStampStyle = { shape: StampShape; ink: string; icon: Category }

/**
 * The look of a pin's stamp. What the author set wins; the rest follows from the category and the
 * pin id, so a pin keeps the same stamp every time and nothing has to be drawn by hand.
 */
export function stampStyle(pin: Pick<Pin, 'id' | 'category' | 'stamp'>): ResolvedStampStyle {
  const seed = hashString(pin.id)
  const fromCategory = categoryChain(pin.category)
    .map((c) => SHAPE_BY_CATEGORY[c])
    .find((s) => s !== undefined)
  return {
    shape: pin.stamp?.shape ?? fromCategory ?? FALLBACK_SHAPES[seed % FALLBACK_SHAPES.length],
    ink: pin.stamp?.ink ?? INKS[seed % INKS.length],
    icon: pin.stamp?.icon ?? pin.category,
  }
}

/** Splits a title over at most two lines of at most `max` characters each, breaking at spaces. */
export function splitTitle(title: string, max = 9): [string, string] {
  const words = title.trim().toUpperCase().split(/\s+/)
  const lines: string[] = ['']
  for (const word of words) {
    const current = lines[lines.length - 1]
    if (!current) lines[lines.length - 1] = word
    else if (lines.length === 1 && `${current} ${word}`.length > max) lines.push(word)
    else lines[lines.length - 1] = `${current} ${word}`
  }
  const clip = (line: string) => (line.length > max ? `${line.slice(0, max - 1)}…` : line)
  return [clip(lines[0] ?? ''), clip(lines[1] ?? '')]
}
