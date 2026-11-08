import { hashString } from 'pinpoint-core'

/** The repository the preview pretends to be on GitHub. */
export const MOCK_REPO = { owner: 'meesvandongen', repo: 'pinpoint', branch: 'main' } as const

// Every JSON file of content/, as text, bundled into preview builds only.
const files = import.meta.glob('../../../../content/**/*.json', { query: '?raw', import: 'default', eager: true }) as Record<string, string>

/** `content/quests/x.json` → file text. */
export function seedFiles(): Record<string, string> {
  return Object.fromEntries(Object.entries(files).map(([path, text]) => [path.replace(/^(\.\.\/)+/, ''), text]))
}

/** Changes whenever the content does, so a redeployed preview starts from its own content instead of an old copy. */
export function seedVersion(): string {
  const all = seedFiles()
  return hashString(Object.keys(all).sort().map((k) => `${k}${all[k]}`).join('|')).toString(36)
}
