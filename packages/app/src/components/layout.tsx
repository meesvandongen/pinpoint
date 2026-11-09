import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { useI18n } from '../i18n/index.ts'

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
  home,
}: {
  title: string
  subtitle?: string
  /** Above the title, such as a back link. */
  children?: ReactNode
  /** Below the title. */
  after?: ReactNode
  /** A shortcut to the start screen, for screens deep in the game. */
  home?: boolean
}) {
  const { t } = useI18n()
  return (
    <header className="cover">
      {home && (
        <Link to="/" className="home-link" aria-label={t('common.home')}>
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
            <path d="M3 11 12 3l9 8M5.5 9.5V20h13V9.5M10 20v-6h4v6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      )}
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
