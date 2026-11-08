import type { ReactNode } from 'react'

/**
 * Shows one page of a short sequence and turns to the next with a small paper-turn animation.
 * Animation is off with reduced motion. Pages are keyed, so each new page plays it once.
 */
export function PageTurn({ index, total, children }: { index: number; total: number; children: ReactNode }) {
  return (
    <div className="pageturn" key={index} data-page={index + 1} data-total={total}>
      {children}
    </div>
  )
}

export function Dots({ index, total }: { index: number; total: number }) {
  if (total < 2) return null
  return (
    <span className="pager-dots" aria-hidden="true">
      {Array.from({ length: total }, (_, i) => (
        <i key={i} className={i === index ? 'on' : ''} />
      ))}
    </span>
  )
}
