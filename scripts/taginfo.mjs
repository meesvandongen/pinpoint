// Fetches the most used values of the OpenStreetMap keys that describe places, from taginfo, and
// saves them as the fixture the category coverage test runs against.
//
//   node scripts/taginfo.mjs
//
// Re-run it now and then and look at what the coverage test reports: new popular values that map to
// nothing are a sign that a category is missing.
import { writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

// key -> how many of its most used values to keep
const KEYS = {
  tourism: 40,
  historic: 40,
  amenity: 70,
  building: 50,
  man_made: 40,
  leisure: 40,
  natural: 25,
  shop: 40,
  railway: 15,
  waterway: 12,
  public_transport: 6,
  landuse: 25,
  place: 15,
  highway: 25,
}

const out = new URL('../packages/core/src/osm-values.json', import.meta.url)
const keys = {}
let dataUntil = ''
for (const [key, count] of Object.entries(KEYS)) {
  const url = new URL('https://taginfo.openstreetmap.org/api/4/key/values')
  url.search = new URLSearchParams({
    key,
    filter: 'all',
    sortname: 'count',
    sortorder: 'desc',
    rp: String(count),
    page: '1',
    qtype: 'value',
  }).toString()
  const res = await fetch(url, { headers: { 'user-agent': 'pinpoint-taginfo-script (https://github.com/meesvandongen/pinpoint)' } })
  if (!res.ok) throw new Error(`${key}: HTTP ${res.status}`)
  const body = await res.json()
  dataUntil = body.data_until
  keys[key] = body.data.map((row) => ({ value: row.value, count: row.count }))
  console.log(`${key}: ${keys[key].length} values`)
}

await writeFile(out, `${JSON.stringify({ source: 'https://taginfo.openstreetmap.org', dataUntil, keys }, null, 1)}\n`)
console.log(`Wrote ${fileURLToPath(out)}`)
