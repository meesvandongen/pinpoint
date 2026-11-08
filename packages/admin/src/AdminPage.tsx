import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { AuthError, GitVFS, NotFoundError, type TokenProvider } from 'gitvfs'
import { github } from 'gitvfs/providers/github'
import { createCms, nominatimGeocoder } from 'gitvfs-cms'
import { CmsApp } from 'gitvfs-cms/react'
import { createGitHubAuth, type GitHubAuth } from 'gitvfs-github-auth'
import 'gitvfs-cms/styles.css'
import './admin.css'
import { CluesField } from './fields/CluesField.tsx'
import { LocalizedField } from './fields/LocalizedField.tsx'
import { QuizField } from './fields/QuizField.tsx'
import { collections } from './model.ts'
import { LocationPreview, QuestPreview } from './previews.tsx'

/** The repository whose `content/` folder the editor changes. */
export const REPOSITORY = { owner: 'meesvandongen', repo: 'pinpoint', branch: 'main' } as const

const TOKEN_KEY = 'pinpoint-admin:github-token'
const BRANCH_KEY = 'pinpoint-admin:branch'

type Session = { method: 'github' | 'token' | 'mock'; token: TokenProvider; branch: string }

const formComponents = { localized: LocalizedField, clues: CluesField, quiz: QuizField }
const previews = { quests: QuestPreview, locations: LocationPreview }
const mapDefaults = { geocoder: nominatimGeocoder({ language: 'en' }) }

function storageGet(key: string): string | null {
  try {
    return sessionStorage.getItem(key)
  } catch {
    return null
  }
}

function storageSet(key: string, value: string | null) {
  try {
    if (value === null) sessionStorage.removeItem(key)
    else sessionStorage.setItem(key, value)
  } catch {
    // Private mode: the session lasts until reload.
  }
}

const errorText = (error: unknown) =>
  error instanceof AuthError ? 'GitHub rejected these credentials.' : error instanceof Error ? error.message : String(error)

/** Checks the token can see the repository, and starts the branch from the default one if needed. */
async function ensureBranch(session: Session, repo: typeof REPOSITORY): Promise<void> {
  const repository = github({ token: session.token }).repository(`${repo.owner}/${repo.repo}`)
  try {
    await repository.getBranch(session.branch)
  } catch (error) {
    if (!(error instanceof NotFoundError) || session.branch === repo.branch) throw error
    const base = await repository.getBranch(repo.branch)
    await repository.createBranch(session.branch, base.sha)
  }
}

/** The Worker serves a client ID when "Sign in with GitHub" is set up for this origin; otherwise only tokens work. */
async function loadGitHubAuth(): Promise<GitHubAuth | null> {
  try {
    const response = await fetch('/api/github/config')
    if (!response.ok) return null
    const config = (await response.json()) as { clientId?: string | null; scope?: string; session?: 'cookie' | 'storage' }
    if (!config.clientId) return null
    return createGitHubAuth({
      clientId: config.clientId,
      tokenUrl: '/api/github/token',
      redirectUri: `${location.origin}/admin`,
      scope: config.scope,
      session: config.session === 'cookie' ? 'cookie' : 'storage',
    })
  } catch {
    return null
  }
}

type Boot = { state: 'loading' } | { state: 'ready'; auth: GitHubAuth | null; session: Session | null; error?: string }

/**
 * `/admin`: the quest editor. With `mock` it opens straight away on a copy of the content that lives
 * in the browser (preview builds); otherwise it asks for a GitHub sign-in or a token.
 */
export function AdminPage({ mock = false, repository = REPOSITORY }: { mock?: boolean; repository?: typeof REPOSITORY }) {
  const [boot, setBoot] = useState<Boot>({ state: 'loading' })
  const storedBranch = () => storageGet(BRANCH_KEY) || repository.branch

  useEffect(() => {
    let cancelled = false
    void (async () => {
      if (mock) {
        if (!cancelled) setBoot({ state: 'ready', auth: null, session: { method: 'mock', token: 'preview', branch: repository.branch } })
        return
      }
      const auth = await loadGitHubAuth()
      let session: Session | null = null
      let error: string | undefined
      const pat = storageGet(TOKEN_KEY)
      if (pat) session = { method: 'token', token: pat, branch: storedBranch() }
      if (auth) {
        try {
          const returned = await auth.handleRedirect()
          if (returned || (await auth.restoreSession())) {
            session = { method: 'github', token: auth.token, branch: storedBranch() }
            if (returned) await ensureBranch(session, repository)
          }
        } catch (caught) {
          await auth.signOut()
          session = null
          error =
            caught instanceof NotFoundError
              ? `Signed in, but GitHub does not let this sign-in see ${repository.owner}/${repository.repo}. For a GitHub App, install it on the repository.`
              : errorText(caught)
        }
      }
      if (!cancelled) setBoot({ state: 'ready', auth, session, error })
    })()
    return () => {
      cancelled = true
    }
    // The branch is read once, at start.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mock, repository])

  if (boot.state === 'loading') return <p style={{ padding: 32, fontFamily: 'system-ui' }}>Loading the editor…</p>

  const signOut = async () => {
    if (boot.session?.method === 'github') await boot.auth?.signOut()
    storageSet(TOKEN_KEY, null)
    setBoot({ ...boot, session: null, error: undefined })
  }

  return boot.session ? (
    <Editor session={boot.session} auth={boot.auth} repository={repository} onSignOut={signOut} />
  ) : (
    <SignIn auth={boot.auth} repository={repository} initialError={boot.error} onSignIn={(session) => setBoot({ ...boot, session, error: undefined })} />
  )
}

function Editor({ session, auth, repository, onSignOut }: { session: Session; auth: GitHubAuth | null; repository: typeof REPOSITORY; onSignOut(): Promise<void> }) {
  const [login, setLogin] = useState<string | null>(null)
  const mock = session.method === 'mock'

  useEffect(() => {
    if (session.method !== 'github' || !auth) return
    auth.fetchUser().then((user) => setLogin(user.login), () => setLogin(null))
  }, [session, auth])

  const cms = useMemo(
    () =>
      createCms({
        fs: new GitVFS({ repository: github({ token: session.token }).repository(`${repository.owner}/${repository.repo}`), branch: session.branch }),
        collections,
        // Real edits go through pull requests. In a preview the copy is private, so saves are direct and quick.
        changes: mock ? false : true,
      }),
    [session, repository, mock],
  )

  return (
    <div className="pp-admin">
      <CmsApp
        cms={cms}
        title={<a href="/">Pinpoint content</a>}
        formComponents={formComponents}
        previews={previews}
        mapDefaults={mapDefaults}
        sidebarFooter={
          <div style={{ display: 'grid', gap: 8, fontSize: 12 }}>
            {mock && <div className="pp-banner">Preview: edits go to a copy of the content in this browser, and show up in the game straight away.</div>}
            {login && <span>Signed in as @{login}</span>}
            <span className="gcms-muted">
              {repository.owner}/{repository.repo} @ {session.branch}
            </span>
            {!mock && (
              <button type="button" className="gcms-button gcms-button--small" onClick={() => void onSignOut()}>
                Sign out
              </button>
            )}
          </div>
        }
      />
    </div>
  )
}

function SignIn({ auth, repository, initialError, onSignIn }: { auth: GitHubAuth | null; repository: typeof REPOSITORY; initialError?: string; onSignIn(session: Session): void }) {
  const [token, setToken] = useState('')
  const [branch, setBranch] = useState(storageGet(BRANCH_KEY) || repository.branch)
  const [status, setStatus] = useState<{ busy: boolean; error?: string }>({ busy: false, error: initialError })
  const chosen = () => branch.trim() || repository.branch

  const signInWithToken = async (event: FormEvent) => {
    event.preventDefault()
    if (!token.trim()) return
    const session: Session = { method: 'token', token: token.trim(), branch: chosen() }
    setStatus({ busy: true })
    try {
      await ensureBranch(session, repository)
      storageSet(TOKEN_KEY, token.trim())
      storageSet(BRANCH_KEY, session.branch)
      onSignIn(session)
    } catch (error) {
      setStatus({ busy: false, error: errorText(error) })
    }
  }

  const tokenForm = (
    <form className="pp-signin" style={{ padding: 0 }} onSubmit={signInWithToken}>
      <label>
        GitHub token
        <input type="password" autoComplete="off" required value={token} onChange={(e) => setToken(e.target.value)} />
        <small>
          A <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noreferrer">fine-grained token</a> with Contents and Pull requests read and write access to the repository.
        </small>
      </label>
      <button type="submit" disabled={status.busy} className={auth ? 'secondary' : undefined}>
        {status.busy ? 'Checking access…' : 'Open the editor'}
      </button>
    </form>
  )

  return (
    <main className="pp-signin">
      <h1>Edit the quests</h1>
      <p>
        Quests and locations are JSON files in <code>{repository.owner}/{repository.repo}</code>. This editor runs in your browser: every save is a commit made in your name, on a branch of your own that you can turn into a pull request.
      </p>
      <label>
        Branch
        <input value={branch} onChange={(e) => setBranch(e.target.value)} />
        <small>Changes are made on branches starting with <code>cms/</code>, off <code>{repository.branch}</code>.</small>
      </label>
      {status.error && <p role="alert" className="error">{status.error}</p>}
      {auth ? (
        <>
          <button
            type="button"
            disabled={status.busy}
            onClick={async () => {
              setStatus({ busy: true })
              storageSet(BRANCH_KEY, chosen())
              await auth.login()
            }}
          >
            Sign in with GitHub
          </button>
          <details>
            <summary>Use a personal access token instead</summary>
            <div style={{ marginTop: 16 }}>{tokenForm}</div>
          </details>
        </>
      ) : (
        tokenForm
      )}
      <p>
        No write access to the repository? Open a pull request with the JSON files instead: see <a href="https://github.com/meesvandongen/pinpoint/blob/main/docs/contributing.md" target="_blank" rel="noreferrer">the contributor guide</a>.
      </p>
    </main>
  )
}
