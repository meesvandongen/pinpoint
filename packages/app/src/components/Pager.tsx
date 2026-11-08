import { useState, type ReactNode } from 'react'

/** A page of items with a turn button on each side. Lists never scroll; they page. */
export function Pager<T>({
  items,
  perPage,
  render,
  label = 'items',
}: {
  items: T[]
  perPage: number
  render(item: T): ReactNode
  label?: string
}) {
  const pages = Math.max(1, Math.ceil(items.length / perPage))
  const [page, setPage] = useState(0)
  const current = Math.min(page, pages - 1)
  return (
    <div className="pager">
      <div className="pager-items">{items.slice(current * perPage, (current + 1) * perPage).map(render)}</div>
      {pages > 1 && (
        <nav className="pager-nav" aria-label={`Pages of ${label}`}>
          <button type="button" className="turn" disabled={current === 0} onClick={() => setPage(current - 1)} aria-label="Previous page">
            ‹
          </button>
          <span className="pager-dots" aria-live="polite">
            {Array.from({ length: pages }, (_, i) => (
              <i key={i} className={i === current ? 'on' : ''} />
            ))}
          </span>
          <button type="button" className="turn" disabled={current === pages - 1} onClick={() => setPage(current + 1)} aria-label="Next page">
            ›
          </button>
        </nav>
      )}
    </div>
  )
}
