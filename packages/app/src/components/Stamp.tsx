import { useId } from 'react'
import type { Category } from 'pinpoint-core'
import { CLUE_GLYPHS, categoryIcon } from './icons.tsx'

export type StampProps = {
  title: string
  category: Category
  ink?: string
  /** ISO timestamp. */
  at: string
  clues: string[]
  /** Clue types that get a mark, in display order. */
  className?: string
}

const GLYPH_ORDER = ['text', 'distance', 'direction', 'map', 'photo']

function hash(text: string) {
  let h = 0
  for (const ch of text) h = (h * 31 + ch.charCodeAt(0)) | 0
  return Math.abs(h)
}

function shortDate(iso: string) {
  const d = new Date(iso)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${String(d.getFullYear()).slice(2)}`
}

/** A round ink stamp. Other shapes come later; the shape field in content is already accepted. */
export function Stamp({ title, category, ink = '#5b34a8', at, clues, className }: StampProps) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '')
  const seed = hash(title + at)
  const rotation = (seed % 15) - 7
  const marks = GLYPH_ORDER.filter((t) => clues.includes(t))
  const size = 14
  const gap = 4
  const start = 100 - (marks.length * size + (marks.length - 1) * gap) / 2
  const name = title.toUpperCase().slice(0, 16)
  return (
    <svg viewBox="0 0 200 200" className={className} role="img" aria-label={`Stamp: ${title}`}>
      <defs>
        <filter id={`ink${id}`} x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" seed={(seed % 90) + 3} result="n" />
          <feColorMatrix in="n" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 -2.4 2.0" result="m" />
          <feComposite in="SourceGraphic" in2="m" operator="in" result="s" />
          <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed={seed % 50} result="w" />
          <feDisplacementMap in="s" in2="w" scale="3" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <path id={`top${id}`} d="M36 100A64 64 0 0 1 164 100" />
        <path id={`bot${id}`} d="M27 100A73 73 0 0 0 173 100" />
      </defs>
      <g filter={`url(#ink${id})`}>
        <g transform={`rotate(${rotation} 100 100)`} style={{ color: ink }} fill="none" stroke="currentColor" opacity=".94">
          <circle cx="100" cy="100" r="92" strokeWidth="5" />
          <circle cx="100" cy="100" r="84" strokeWidth="1.5" />
          <circle cx="100" cy="100" r="57" strokeWidth="2" />
          <g fill="currentColor" stroke="none" fontFamily="Courier Prime, monospace" fontWeight="700" fontSize="11" letterSpacing="2" textAnchor="middle">
            <text><textPath href={`#top${id}`} startOffset="50%">{name}</textPath></text>
            <text><textPath href={`#bot${id}`} startOffset="50%">{`PINPOINT · ${shortDate(at)}`}</textPath></text>
            <circle cx="31.5" cy="100" r="2.6" />
            <circle cx="168.5" cy="100" r="2.6" />
          </g>
          <svg x="64" y="58" width="72" height="72" viewBox="0 0 24 24">{categoryIcon(category)}</svg>
          {marks.map((t, i) => (
            <svg key={t} x={start + i * (size + gap)} y="133" width={size} height={size} viewBox="0 0 24 24">
              {CLUE_GLYPHS[t]}
            </svg>
          ))}
        </g>
      </g>
    </svg>
  )
}
