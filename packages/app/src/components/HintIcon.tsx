import { ASSISTIVE_TYPES } from 'pinpoint-core'

/** Every kind of hint has one picture, used wherever the hint shows up: its tab, its reading, the button that asks for it. */
const PATHS: Record<string, string> = {
  text: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>',
  photo: '<path d="M3 8h4l2-3h6l2 3h4v11H3z"/><circle cx="12" cy="13" r="3.5"/>',
  audio: '<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/>',
  wordShape: '<path d="M3 14 6.5 5 10 14M4.6 11h3.8M13 14h8"/><path d="M3 19h18"/>',
  map: '<path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z"/><path d="M9 4v14M15 6v14"/>',
  direction: '<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5 13.5 13.5 8.5 15.5 10.5 10.5z"/>',
  distance: '<rect x="2" y="8" width="20" height="8" rx="1.5"/><path d="M6 8v4M10 8v3M14 8v4M18 8v3"/>',
}

/** Hints that point the way cost a point, which a gold ring and a small star make visible everywhere. */
export const costsPoint = (type: string) => (ASSISTIVE_TYPES as readonly string[]).includes(type)

export function HintIcon({ type, size = 20 }: { type: string; size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: PATHS[type] ?? PATHS.text }}
    />
  )
}

/** The picture in a round badge; gold with a star when this kind of hint costs a point. */
export function HintBadge({ type, size = 30, spent = false }: { type: string; size?: number; spent?: boolean }) {
  const cost = costsPoint(type)
  return (
    <span className={`hint-badge ${cost ? 'cost' : ''} ${spent ? 'spent' : ''}`} style={{ width: size, height: size }}>
      <HintIcon type={type} size={Math.round(size * 0.62)} />
      {cost && <Star className="hint-star" />}
    </span>
  )
}

export function Star({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="m12 2.5 2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6L2.5 9.4l6.6-.8z" fill="currentColor" />
    </svg>
  )
}

/** One star per point still to earn, hollow for each one a hint has used. */
export function Points({ left, max, label }: { left: number; max: number; label: string }) {
  return (
    <span className="points-meter" role="img" aria-label={label}>
      {Array.from({ length: max }, (_, i) => (
        <svg key={i} viewBox="0 0 24 24" className={i < left ? 'on' : ''} aria-hidden="true">
          <path d="m12 2.5 2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6L2.5 9.4l6.6-.8z" fill={i < left ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        </svg>
      ))}
    </span>
  )
}
