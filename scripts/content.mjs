// Validates everything under content/ with the shared schemas: shapes, length limits, the default
// language in every text, pins inside the quest area, files referenced by clues.
//
//   pnpm run content
//
// The app builds its own index of these files, so there is nothing to regenerate.
import { existsSync } from 'node:fs'
import { readdir, readFile } from 'node:fs/promises'
import { basename, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Location, Quest, questProblems } from '../packages/core/src/index.ts'

const root = join(fileURLToPath(new URL('..', import.meta.url)), 'content')

let failed = false
const fail = (path, message) => {
  failed = true
  console.error(`✗ ${relative(root, path)}\n  ${message.replaceAll('\n', '\n  ')}`)
}

async function jsonFiles(dir) {
  const entries = await readdir(join(root, dir), { withFileTypes: true })
  return entries
    .filter((entry) => entry.name.endsWith('.json'))
    .map((entry) => join(root, dir, entry.name))
    .sort((a, b) => a.localeCompare(b))
}

async function check(dir, schema, extra) {
  const ids = new Set()
  let count = 0
  for (const path of await jsonFiles(dir)) {
    count++
    let data
    try {
      const parsed = schema.safeParse(JSON.parse(await readFile(path, 'utf8')))
      if (!parsed.success) {
        fail(path, parsed.error.issues.map((i) => `${i.path.join('.') || '(file)'}: ${i.message}`).join('\n'))
        continue
      }
      data = parsed.data
    } catch (error) {
      fail(path, error instanceof Error ? error.message : String(error))
      continue
    }
    if (data.id !== basename(path, '.json')) fail(path, `the file name must be the id: ${data.id}.json`)
    if (ids.has(data.id)) fail(path, `duplicate id "${data.id}"`)
    ids.add(data.id)
    for (const problem of extra?.(data) ?? []) fail(path, problem)
  }
  return count
}

// Files a clue points at must exist, and stay inside content/.
const missingFiles = (quest) =>
  quest.pins.flatMap((pin) =>
    pin.clues.flatMap((clue) => {
      if ((clue.type !== 'photo' && clue.type !== 'audio') || /^https?:\/\//.test(clue.src)) return []
      const file = resolve(root, clue.src)
      if (!file.startsWith(`${root}/`)) return [`pins.${pin.id}: ${clue.src} points outside content/`]
      return existsSync(file) ? [] : [`pins.${pin.id}: ${clue.src} does not exist`]
    }),
  )

const locations = await check('locations', Location)
const quests = await check('quests', Quest, (quest) => [...questProblems(quest), ...missingFiles(quest)])

if (failed) process.exit(1)
console.log(`✓ ${locations} locations, ${quests} quests`)
