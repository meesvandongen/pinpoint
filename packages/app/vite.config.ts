import { readdirSync, readFileSync, statSync } from 'node:fs'
import { extname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite-plus'
import { defineConfig, lazyPlugins } from 'vite-plus'

const contentDir = fileURLToPath(new URL('../../content', import.meta.url))

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? walk(path) : [path]
  })
}

/** Serves the repository's `content/` folder at `/content` in dev and copies it into the build. */
function content(): Plugin {
  return {
    name: 'pinpoint-content',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = (req.url ?? '').split('?')[0]
        if (!url.startsWith('/content/') || url.includes('..') || extname(url) !== '.json') return next()
        try {
          res.setHeader('content-type', 'application/json')
          res.end(readFileSync(join(contentDir, url.slice('/content/'.length))))
        } catch {
          res.statusCode = 404
          res.end('not found')
        }
      })
    },
    generateBundle() {
      for (const file of walk(contentDir).filter((f) => f.endsWith('.json'))) {
        this.emitFile({
          type: 'asset',
          fileName: `content/${relative(contentDir, file).split('\\').join('/')}`,
          source: readFileSync(file, 'utf8'),
        })
      }
    },
  }
}

export default defineConfig({
  plugins: lazyPlugins(() => [react(), content()]),
  server: { port: 3000, strictPort: true },
})
