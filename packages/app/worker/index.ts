import { createTokenHandler, originMatcher } from 'gitvfs-github-auth/server'

interface Env {
  /** Client ID of the GitHub App behind "Sign in with GitHub" on /admin. Without it the editor asks for a token. */
  GITHUB_CLIENT_ID?: string
  /** Set with `wrangler secret put GITHUB_CLIENT_SECRET`. */
  GITHUB_CLIENT_SECRET?: string
  /**
   * Optional, at least 32 characters (`openssl rand -base64 32`). When set, refresh tokens live in an
   * encrypted HttpOnly cookie instead of the browser's storage. Set with `wrangler secret put`.
   */
  GITHUB_SESSION_SECRET?: string
  /** GitHub Enterprise Server: the web URL. Default: https://github.com */
  GITHUB_URL?: string
  /** OAuth Apps only: the scope to request, such as `public_repo`. */
  GITHUB_SCOPE?: string
  /** Comma-separated origins that may sign in, such as `https://pinpoint.example.com,https://*.pinpoint.example.com`. */
  GITHUB_ALLOWED_ORIGINS?: string
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  })
}

/**
 * The token exchange for "Sign in with GitHub" in the editor. The game itself is static files; only
 * /api/github/* reaches this Worker (see `run_worker_first` in wrangler.jsonc).
 */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    const origins = (env.GITHUB_ALLOWED_ORIGINS ?? '').split(',').filter(Boolean)
    const enabled = Boolean(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET) && originMatcher(origins)(url.origin)
    const sessionSecret = env.GITHUB_SESSION_SECRET
    const cookieSession = Boolean(sessionSecret && sessionSecret.length >= 32)
    if (sessionSecret && !cookieSession) {
      console.warn('GITHUB_SESSION_SECRET is shorter than 32 characters; falling back to browser storage')
    }

    if (url.pathname === '/api/github/config') {
      // GitHub only redirects to registered callback URLs, so other origins get no client ID.
      return json(
        enabled
          ? { clientId: env.GITHUB_CLIENT_ID, scope: env.GITHUB_SCOPE || undefined, session: cookieSession ? 'cookie' : 'storage' }
          : { clientId: null },
      )
    }
    if (url.pathname === '/api/github/token' && enabled) {
      return createTokenHandler({
        clientId: env.GITHUB_CLIENT_ID!,
        clientSecret: env.GITHUB_CLIENT_SECRET!,
        allowedOrigins: origins,
        session: cookieSession ? { secret: sessionSecret!, path: '/api/github' } : undefined,
        githubUrl: env.GITHUB_URL || undefined,
      })(request)
    }
    return json({ error: 'not_found' }, 404)
  },
}
