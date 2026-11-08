// Validates everything under content/ with the shared schemas and writes content/index.json.
// `--check` fails instead of writing, so CI notices a stale index.
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ContentIndex, Location, Quest } from '../packages/core/src/index.ts'

const root = join(fileURLToPath(new URL('..', import.meta.url)), 'content')
const check = process.argv.includes('--check')

async function files(dir) {
  const out = []
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...(await files(path)))
    else if (entry.name.endsWith('.json') && entry.name !== 'index.json') out.push(path)
  }
  return out.sort((a, b) => a.localeCompare(b))
}

let failed = false
const fail = (path, message) => {
  failed = true
  console.error(`✗ ${relative(root, path)}\n  ${message.replaceAll('\n', '\n  ')}`)
}

async function validate(dir, schema) {
  const paths = []
  const ids = new Set()
  for (const path of await files(join(root, dir))) {
    try {
      const data = schema.parse(JSON.parse(await readFile(path, 'utf8')))
      if (ids.has(data.id)) fail(path, `duplicate id "${data.id}"`)
      ids.add(data.id)
      paths.push(relative(root, path).split('\\').join('/'))
    } catch (error) {
      fail(path, error instanceof Error ? error.message : String(error))
    }
  }
  return paths
}

const index = ContentIndex.parse({
  locations: await validate('locations', Location),
  quests: await validate('quests', Quest),
})
const next = `${JSON.stringify(index, null, 2)}\n`
const indexPath = join(root, 'index.json')

if (check) {
  const current = await readFile(indexPath, 'utf8').catch(() => '')
  if (current !== next) fail(indexPath, 'content/index.json is out of date; run `pnpm content`')
} else if (!failed) {
  await writeFile(indexPath, next)
}

if (failed) process.exit(1)
console.log(`✓ ${index.locations.length} locations, ${index.quests.length} quests`)
