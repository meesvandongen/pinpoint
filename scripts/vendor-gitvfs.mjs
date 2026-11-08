// Builds and packs the gitvfs packages Pinpoint uses into vendor/*.tgz.
//
// gitvfs-cms, gitvfs-github-msw and gitvfs-github-auth are not on npm yet, so the app depends on
// tarballs built from a gitvfs checkout. Once they are published, replace the `file:` dependencies
// with version ranges and delete vendor/.
//
//   node scripts/vendor-gitvfs.mjs [path/to/gitvfs]      (default: ../gitvfs)
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const source = resolve(process.argv[2] ?? join(root, '..', 'gitvfs'))
const vendor = join(root, 'vendor')

// Package folder in the gitvfs repository, and the stable file name used here.
const packages = [
  ['gitvfs', 'gitvfs'],
  ['cms', 'gitvfs-cms'],
  ['github-msw', 'gitvfs-github-msw'],
  ['github-auth', 'gitvfs-github-auth'],
]

const run = (cmd, args, cwd) => execFileSync(cmd, args, { cwd, stdio: 'inherit' })
const read = (cmd, args, cwd) => execFileSync(cmd, args, { cwd, encoding: 'utf8' }).trim()

if (!existsSync(join(source, 'pnpm-workspace.yaml'))) {
  console.error(`${source} is not a gitvfs checkout. Pass its path as the first argument.`)
  process.exit(1)
}

const dirty = read('git', ['status', '--porcelain'], source)
if (dirty) console.warn('Warning: the gitvfs checkout has uncommitted changes; the tarballs include them.')

run('pnpm', ['install', '--frozen-lockfile'], source)
mkdirSync(vendor, { recursive: true })
for (const file of readdirSync(vendor)) if (file.endsWith('.tgz')) rmSync(join(vendor, file))

const lines = []
for (const [folder, name] of packages) {
  const dir = join(source, 'packages', folder)
  const { version } = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'))
  run('pnpm', ['run', 'build'], dir)
  run('pnpm', ['pack', '--pack-destination', vendor], dir)
  renameSync(join(vendor, `${name}-${version}.tgz`), join(vendor, `${name}.tgz`))
  lines.push(`| \`${name}\` | ${version} | \`vendor/${name}.tgz\` |`)
}

const sha = read('git', ['rev-parse', 'HEAD'], source)
const remote = read('git', ['remote', 'get-url', 'origin'], source)
writeFileSync(
  join(vendor, 'README.md'),
  `# Vendored gitvfs packages

These tarballs are built from [gitvfs](https://github.com/meesvandongen/gitvfs) at \`${sha}\`
(remote: ${remote}) because \`gitvfs-cms\`, \`gitvfs-github-msw\` and \`gitvfs-github-auth\` are not
published to npm yet.

| Package | Version | File |
| --- | --- | --- |
${lines.join('\n')}

Rebuild them from a gitvfs checkout:

\`\`\`sh
node scripts/vendor-gitvfs.mjs ../gitvfs
pnpm install
\`\`\`

When the packages are on npm, replace the \`file:\` dependencies in \`packages/*/package.json\` with
version ranges, run \`pnpm install\`, and delete this folder and \`scripts/vendor-gitvfs.mjs\`.
`,
)
console.log(`Vendored ${packages.length} packages from ${sha.slice(0, 7)}`)
