import { useMemo } from 'react'
import type { Category, Extra } from 'pinpoint-core'
import { extraMarkSvg, iconSvg, pointStampSvg, questStampSvg, stampSvg, type QuestStampProps, type StampSvgProps } from './svg.ts'

type Html = { __html: string }

/** Markup from `svg.ts` escapes every piece of text it takes from quest files. */
const html = (svg: string): Html => ({ __html: svg })

export function Stamp({ stamp, className }: { stamp: StampSvgProps; className?: string }) {
  const svg = useMemo(() => stampSvg(stamp), [stamp])
  return <span className={`stamp ${className ?? ''}`} dangerouslySetInnerHTML={html(svg)} />
}

export function QuestStamp({ stamp, className }: { stamp: QuestStampProps; className?: string }) {
  const svg = useMemo(() => questStampSvg(stamp), [stamp])
  return <span className={`stamp ${className ?? ''}`} dangerouslySetInnerHTML={html(svg)} />
}

export const EXTRA_INK: Record<Extra, string> = {
  quiz: '#5b34a8',
  photo: '#1c7a58',
  night: '#1b4a96',
  sunrise: '#a8302a',
  rain: '#17707a',
  together: '#2b2a26',
}

export function ExtraMark({ extra, label, seed, className }: { extra: Extra; label: string; seed: string; className?: string }) {
  const svg = useMemo(() => extraMarkSvg(extra, EXTRA_INK[extra], label, seed), [extra, label, seed])
  return <span className={`extra ${className ?? ''}`} dangerouslySetInnerHTML={html(svg)} />
}

export function CategoryIcon({ category, size = 24 }: { category: Category; size?: number }) {
  return <span className="category-icon" dangerouslySetInnerHTML={html(iconSvg(category, size))} />
}

/** One small star stamp, for one point. */
export function PointStamp({ seed, index, className }: { seed: string; index: number; className?: string }) {
  const svg = useMemo(() => pointStampSvg(seed, index), [seed, index])
  return <span className={`point-stamp ${className ?? ''}`} dangerouslySetInnerHTML={html(svg)} />
}
