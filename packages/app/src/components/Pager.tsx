import { useLayoutEffect, useRef, useState, type CSSProperties, type Key, type ReactNode } from 'react'
import { useI18n } from '../i18n/index.ts'

const NAV_HEIGHT = 52

/** How many items fit: as many rows as the height allows, with room for the page buttons only when they are needed. */
export function pageCapacity(height: number, rowHeight: number, gap: number, columns: number, count: number): number {
  if (height <= 0) return count
  const rows = (h: number) => Math.max(1, Math.floor((h + gap) / (rowHeight + gap)))
  const withoutNav = rows(height) * columns
  if (count <= withoutNav) return withoutNav
  return Math.max(columns, rows(height - NAV_HEIGHT) * columns)
}

/**
 * A page of items with a turn button on each side. Lists never scroll: the number of items per page
 * follows from the room there is, so nothing is ever cut off, on a small phone or with large text.
 * Every item gets the same fixed height.
 */
export function Pager<T>({
  items,
  rowHeight,
  keyOf,
  render,
  columns = 1,
  gap = 10,
  label,
  bleed = false,
}: {
  items: T[]
  /** The height every item is given, in pixels. */
  rowHeight: number
  keyOf: (item: T) => Key
  render: (item: T) => ReactNode
  columns?: number
  gap?: number
  /** Names the list for screen readers. */
  label: string
  /** Let items draw outside their cell, such as a stamp over the edge of its page. */
  bleed?: boolean
}) {
  const { t } = useI18n()
  const root = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState(0)
  const [page, setPage] = useState(0)

  useLayoutEffect(() => {
    const el = root.current
    if (!el) return
    setHeight(el.clientHeight)
    const observer = new ResizeObserver(() => setHeight(el.clientHeight))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const perPage = pageCapacity(height, rowHeight, gap, columns, items.length)
  const pages = Math.max(1, Math.ceil(items.length / perPage))
  const current = Math.min(page, pages - 1)
  const style = { '--cols': columns, '--gap': `${gap}px` } as CSSProperties

  return (
    <div className={`pager${bleed ? ' bleed' : ''}`} ref={root} style={style}>
      <div className="pager-items" role="list" aria-label={label}>
        {items.slice(current * perPage, (current + 1) * perPage).map((item) => (
          <div role="listitem" key={keyOf(item)} className="pager-item" style={{ height: rowHeight }}>
            {render(item)}
          </div>
        ))}
      </div>
      {pages > 1 && (
        <nav className="pager-nav" aria-label={label}>
          <button type="button" className="turn" disabled={current === 0} onClick={() => setPage(current - 1)} aria-label={t('common.previousPage')}>
            ‹
          </button>
          <span className="pager-dots" aria-live="polite">
            {Array.from({ length: pages }, (_, i) => (
              <i key={i} className={i === current ? 'on' : ''} />
            ))}
          </span>
          <button type="button" className="turn" disabled={current === pages - 1} onClick={() => setPage(current + 1)} aria-label={t('common.nextPage')}>
            ›
          </button>
        </nav>
      )}
    </div>
  )
}
