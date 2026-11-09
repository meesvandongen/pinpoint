import { hashString } from 'pinpoint-core'
import files from 'virtual:pinpoint-content-seed'

/** The repository the preview pretends to be on GitHub. */
export const MOCK_REPO = { owner: 'meesvandongen', repo: 'pinpoint', branch: 'main' } as const

/** `content/quests/x.json` → file text, for every JSON file of the content folder. Bundled into preview builds only. */
export function seedFiles(): Record<string, string> {
  return { ...files }
}

/** Changes whenever the content does, so a redeployed preview starts from its own content instead of an old copy. */
export function seedVersion(): string {
  const all = seedFiles()
  return hashString(Object.keys(all).sort().map((k) => `${k}${all[k]}`).join('|')).toString(36)
}
