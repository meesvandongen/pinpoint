import { ContentIndex, idFromPath, Location, Quest } from './schema.ts'

export type Content = { locations: Location[]; quests: Quest[] }

type Fetcher = (url: string) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>

const join = (base: string, path: string) => `${base.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`

/**
 * Loads `index.json` and every file it lists from a base URL: the app's own `/content`,
 * or `https://raw.githubusercontent.com/<owner>/<repo>/<branch>/content`.
 * Files that fail validation are reported and skipped, so one bad contribution cannot break the game.
 */
export async function loadContent(
  base: string,
  options: { fetcher?: Fetcher; onInvalid?: (path: string, message: string) => void } = {},
): Promise<Content> {
  const fetcher = options.fetcher ?? ((url) => fetch(url))
  const getJson = async (path: string) => {
    const res = await fetcher(join(base, path))
    if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`)
    return res.json()
  }
  const index = ContentIndex.parse(await getJson('index.json'))
  const load = async <T>(paths: string[], schema: { safeParse(v: unknown): { success: true; data: T } | { success: false; error: { message: string } } }) => {
    const settled = await Promise.all(
      paths.map(async (path) => {
        try {
          // The file name is the id; a stray `id` inside the file does not count.
          const json = (await getJson(path)) as Record<string, unknown>
          const parsed = schema.safeParse({ ...json, id: idFromPath(path) })
          if (parsed.success) return parsed.data
          options.onInvalid?.(path, parsed.error.message)
        } catch (error) {
          options.onInvalid?.(path, error instanceof Error ? error.message : String(error))
        }
        return undefined
      }),
    )
    return settled.filter((x): x is Awaited<T> => x !== undefined) as T[]
  }
  const [locations, quests] = await Promise.all([load(index.locations, Location), load(index.quests, Quest)])
  return { locations, quests }
}
