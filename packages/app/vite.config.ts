import { readdirSync, readFileSync, statSync } from 'node:fs'
import { extname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { msw } from 'msw/vite'
import type { Plugin } from 'vite-plus'
import { defineConfig, lazyPlugins } from 'vite-plus'

const contentDir = fileURLToPath(new URL('../../content', import.meta.url))

const MIME: Record<string, string> = {
  '.json': 'application/json',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.m4a': 'audio/mp4',
  '.wav': 'audio/wav',
}

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? walk(path) : [path]
  })
}

const jsonIn = (folder: string) =>
  readdirSync(join(contentDir, folder))
    .filter((name) => name.endsWith('.json'))
    .sort((a, b) => a.localeCompare(b))
    .map((name) => `${folder}/${name}`)

/** The list of files to load, built from the folders so nobody has to keep an index up to date. */
const contentIndex = () => JSON.stringify({ locations: jsonIn('locations'), quests: jsonIn('quests') }, null, 2)

/** Serves the repository's `content/` folder at `/content` in dev and copies it into the build. */
function content(): Plugin {
  return {
    name: 'pinpoint-content',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = decodeURIComponent((req.url ?? '').split('?')[0])
        if (!url.startsWith('/content/') || url.includes('..')) return next()
        const path = url.slice('/content/'.length)
        try {
          res.setHeader('content-type', MIME[extname(path)] ?? 'application/octet-stream')
          res.end(path === 'index.json' ? contentIndex() : readFileSync(join(contentDir, path)))
        } catch {
          res.statusCode = 404
          res.end('not found')
        }
      })
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'content/index.json', source: contentIndex() })
      for (const file of walk(contentDir)) {
        const name = relative(contentDir, file).split('\\').join('/')
        if (name === 'index.json') continue
        this.emitFile({ type: 'asset', fileName: `content/${name}`, source: readFileSync(file) })
      }
    },
  }
}

/**
 * Test tools (a location simulator, mocked services, the TanStack devtools) are on in the dev server
 * and in builds for branches other than the production branch on Cloudflare Workers Builds, so every
 * preview can be played at a desk. Set `VITE_TEST_TOOLS=true` or `false` to decide by hand.
 */
function testToolsEnabled(command: string): boolean {
  const forced = process.env.VITE_TEST_TOOLS
  if (forced === 'true' || forced === 'false') return forced === 'true'
  if (command === 'serve') return true
  const branch = process.env.WORKERS_CI_BRANCH
  return !!branch && branch !== (process.env.PINPOINT_PRODUCTION_BRANCH ?? 'main')
}

export default defineConfig(({ command }) => ({
  // MSW's worker script is only served and emitted when the test tools are on.
  plugins: lazyPlugins(() => [react(), content(), ...(testToolsEnabled(command) ? [msw({ mode: 'worker-only' })] : [])]),
  define: { 'import.meta.env.VITE_TEST_TOOLS': JSON.stringify(String(testToolsEnabled(command))) },
  server: { port: 3000, strictPort: true },
  test: { globals: true, environment: 'happy-dom' },
}))
