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

/** The picture in a round badge. */
export function HintBadge({ type, size = 30, spent = false }: { type: string; size?: number; spent?: boolean }) {
  return (
    <span className={`hint-badge ${spent ? 'spent' : ''}`} style={{ width: size, height: size }}>
      <HintIcon type={type} size={Math.round(size * 0.62)} />
    </span>
  )
}
