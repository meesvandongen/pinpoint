import { queryOptions } from '@tanstack/react-query'
import { loadContent } from 'pinpoint-core'

/**
 * Where game content is read from: the `content/` folder of this repository as built into the app.
 * Point `VITE_CONTENT_URL` at any host that serves the same files (and an `index.json`) to read it elsewhere.
 */
export const CONTENT_URL: string = import.meta.env.VITE_CONTENT_URL ?? '/content'

export const contentQuery = queryOptions({
  queryKey: ['content', CONTENT_URL],
  queryFn: () =>
    loadContent(CONTENT_URL, { onInvalid: (path, message) => console.warn(`Skipped ${path}: ${message}`) }),
  staleTime: 5 * 60_000,
})

/** Where a file named in a quest (a photo or sound clue) can be fetched from. */
export function mediaUrl(src: string, base: string = CONTENT_URL): string {
  if (/^(?:[a-z]+:)?\/\//i.test(src) || src.startsWith('data:') || src.startsWith('blob:')) return src
  return `${base.replace(/\/+$/, '')}/${src.replace(/^\/+/, '')}`
}
