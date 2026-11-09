import {
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type Key,
  type ReactNode,
} from 'react'
import { useI18n } from '../i18n/index.ts'

const NAV_HEIGHT = 52

/** A layout with more columns is chosen when its cells are at least this share of the biggest possible. */
const CLOSE_ENOUGH = 0.8

export type Fit = {
  cols: number
  rows: number
  /** Size of one cell, in pixels. */
  width: number
  height: number
  /** How many cells one page holds. All of them when everything fits. */
  perPage: number
}

/**
 * The biggest cells that hold every item in the room there is, in as many columns as work best. Only when
 * the cells would get smaller than `minWidth` does the list page instead, with the cells at the size that
 * fills the room. `aspect` is width over height.
 */
export function fitGrid({
  width,
  height,
  count,
  aspect,
  gap,
  minWidth,
  maxWidth,
  navHeight = NAV_HEIGHT,
}: {
  width: number
  height: number
  count: number
  aspect: number
  gap: number
  minWidth: number
  maxWidth: number
  navHeight?: number
}): Fit {
  const cell = (cols: number, rows: number, h: number) =>
    Math.max(
      0,
      Math.min(
        (width - (cols - 1) * gap) / cols,
        ((h - (rows - 1) * gap) / rows) * aspect,
        maxWidth,
      ),
    )
  const make = (cols: number, rows: number, w: number, perPage: number): Fit => ({
    cols,
    rows,
    width: w,
    height: w / aspect,
    perPage,
  })

  // The size is not known yet: show everything, small.
  if (width <= 0 || height <= 0 || count <= 0)
    return make(
      Math.min(2, Math.max(1, count)),
      Math.ceil(count / 2) || 1,
      minWidth,
      Math.max(count, 1),
    )

  // The largest cells win, but a layout with more columns is preferred when it costs little size: a phone
  // reads as a grid of two, not a tall list of one that is a few pixels bigger.
  const layouts = Array.from({ length: count }, (_, i) => {
    const cols = i + 1
    const rows = Math.ceil(count / cols)
    return make(cols, rows, cell(cols, rows, height), count)
  })
  const biggest = Math.max(...layouts.map((l) => l.width))
  const best = layouts.filter((l) => l.width >= biggest * CLOSE_ENOUGH).at(-1)
  if (best && best.width >= minWidth) return best

  // Too small to read: page it. As many columns and rows as hold cells of the smallest size, then grown to fill.
  const room = height - navHeight
  const cols = Math.max(1, Math.floor((width + gap) / (minWidth + gap)))
  const rows = Math.max(1, Math.floor((room + gap) / (minWidth / aspect + gap)))
  return make(
    cols,
    rows,
    Math.max(cell(cols, rows, room), Math.min(minWidth, maxWidth)),
    cols * rows,
  )
}

/**
 * A grid of equal cells that makes the most of the room it is given: as large as the screen allows, in the
 * number of columns that suits it, never scrolling. What does not fit at a readable size is paged.
 * Cells are `--cell-w` by `--cell-h` pixels, and `--u` is one design pixel of a cell made 150 wide.
 */
export function FitGrid<T>({
  items,
  aspect,
  keyOf,
  render,
  label,
  gap = 12,
  minWidth = 108,
  maxWidth = 420,
  focusIndex,
}: {
  items: T[]
  /** Width over height of a cell. */
  aspect: number
  keyOf: (item: T) => Key
  render: (item: T) => ReactNode
  /** Names the list for screen readers. */
  label: string
  /** An item to show: the grid opens on its page until the player turns pages. */
  focusIndex?: number
  gap?: number
  minWidth?: number
  maxWidth?: number
}) {
  const { t } = useI18n()
  const root = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [page, setPage] = useState<number>()

  useLayoutEffect(() => {
    const el = root.current
    if (!el) return
    const measure = () => setSize({ width: el.clientWidth, height: el.clientHeight })
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const fit = fitGrid({ ...size, count: items.length, aspect, gap, minWidth, maxWidth })
  const pages = Math.max(1, Math.ceil(items.length / fit.perPage))
  const focused = focusIndex !== undefined && focusIndex >= 0 ? Math.floor(focusIndex / fit.perPage) : 0
  const current = Math.min(page ?? focused, pages - 1)
  const style = {
    '--cols': fit.cols,
    '--gap': `${gap}px`,
    '--cell-w': `${fit.width.toFixed(1)}px`,
    '--cell-h': `${fit.height.toFixed(1)}px`,
    '--u': `${(fit.width / 150).toFixed(4)}px`,
  } as CSSProperties

  return (
    <div className="fit" ref={root} style={style}>
      <div className="fit-grid" role="list" aria-label={label}>
        {items.slice(current * fit.perPage, (current + 1) * fit.perPage).map((item) => (
          <div role="listitem" key={keyOf(item)} className="fit-item">
            {render(item)}
          </div>
        ))}
      </div>
      {pages > 1 && (
        <nav className="pager-nav" aria-label={label}>
          <button
            type="button"
            className="turn"
            disabled={current === 0}
            onClick={() => setPage(current - 1)}
            aria-label={t('common.previousPage')}
          >
            ‹
          </button>
          <span className="pager-dots" aria-live="polite">
            {Array.from({ length: pages }, (_, i) => (
              <i key={i} className={i === current ? 'on' : ''} />
            ))}
          </span>
          <button
            type="button"
            className="turn"
            disabled={current === pages - 1}
            onClick={() => setPage(current + 1)}
            aria-label={t('common.nextPage')}
          >
            ›
          </button>
        </nav>
      )}
    </div>
  )
}
