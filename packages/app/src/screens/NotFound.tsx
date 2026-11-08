import { Link } from '@tanstack/react-router'
import { Body, Cover, Foot, Screen } from '../components/layout.tsx'
import { useI18n } from '../i18n/index.ts'

export function NotFound() {
  const { t } = useI18n()
  return (
    <Screen>
      <Cover title={t('app.name')} />
      <Body>
        <div className="card">
          <h2>{t('error.notFound.title')}</h2>
          <p>{t('error.notFound.body')}</p>
        </div>
      </Body>
      <Foot>
        <Link to="/" className="btn primary">
          {t('error.home')}
        </Link>
      </Foot>
    </Screen>
  )
}

export function Loading() {
  const { t } = useI18n()
  return (
    <Screen>
      <Cover title={t('app.name')} subtitle={t('common.loading')} />
    </Screen>
  )
}

export function LoadError({ error, reset }: { error: unknown; reset?: () => void }) {
  const { t } = useI18n()
  return (
    <Screen>
      <Cover title={t('app.name')} />
      <Body>
        <div className="card">
          <h2>{t('error.content.title')}</h2>
          <p>{error instanceof Error ? error.message : String(error)}</p>
        </div>
      </Body>
      <Foot>
        <button type="button" className="btn primary" onClick={() => (reset ? reset() : location.reload())}>
          {t('common.retry')}
        </button>
      </Foot>
    </Screen>
  )
}
