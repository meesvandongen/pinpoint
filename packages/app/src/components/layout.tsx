import type { ReactNode } from 'react'

/**
 * Every screen is a grid of cover, page and footer that fills the viewport and never scrolls.
 * Content that does not fit has to page (see `Pager`), never be clipped.
 */
export function Screen({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`screen ${className}`}>{children}</section>
}

export function Cover({
  title,
  subtitle,
  children,
  after,
}: {
  title: string
  subtitle?: string
  /** Above the title, such as a back link. */
  children?: ReactNode
  /** Below the title. */
  after?: ReactNode
}) {
  return (
    <header className="cover">
      {children}
      <h1>{title}</h1>
      {subtitle && <p>{subtitle}</p>}
      {after}
    </header>
  )
}

export function Body({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`body ${className}`}>{children}</div>
}

export function Foot({ children }: { children: ReactNode }) {
  return <footer className="foot">{children}</footer>
}
