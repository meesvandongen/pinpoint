import { Link, useNavigate } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { locationsContaining, ringArea } from 'pinpoint-core'
import { Body, Cover, Foot, Screen } from '../components/layout.tsx'
import { Pager } from '../components/Pager.tsx'
import { contentQuery } from '../content.ts'
import { useI18n } from '../i18n/index.ts'
import { currentFix, retryLocation, startWatching, useLocationState } from '../state/location.ts'
import { resolveText } from 'pinpoint-core'

export const ROW_HEIGHT = 56

export function Home() {
  const { data: content } = useSuspenseQuery(contentQuery)
  const { t, contentLanguages } = useI18n()
  const navigate = useNavigate()
  const location = useLocationState()
  const fix = currentFix(location)

  const near = fix ? locationsContaining(fix, content.locations) : []
  const nearIds = new Set(near.map((l) => l.id))
  const others = content.locations
    .filter((l) => !nearIds.has(l.id))
    .sort((a, b) => ringArea(a.polygon) - ringArea(b.polygon))
  const list = [...near, ...others]
  const asking = location.status === 'idle' && !fix

  return (
    <Screen>
      <Cover title={t('app.name')} subtitle={t('home.tagline')} />
      <Body>
        {asking ? (
          <div className="card">
            <h2>{t('home.ask.title')}</h2>
            <p>{t('home.ask.body')}</p>
            <button type="button" className="btn primary" onClick={startWatching}>
              {t('home.ask.button')}
            </button>
          </div>
        ) : fix && near.length ? null : (
          <div className="notice" role="status">
            <p className={`status ${location.error === 'denied' ? 'warn' : ''}`}>
              {fix ? t('home.nowhere') : location.error ? t(`location.${location.error}`) : t('home.locating')}
            </p>
            {!fix && (location.error === 'denied' || location.error === 'unavailable') && (
              <button type="button" className="btn small" onClick={retryLocation}>
                {t('location.retry')}
              </button>
            )}
          </div>
        )}
        <h2 className="sub">{fix && near.length ? t('home.placesNear') : t('home.choose')}</h2>
        <Pager
          items={list}
          rowHeight={ROW_HEIGHT}
          label={t('home.places')}
          keyOf={(l) => l.id}
          render={(l) => (
            <button
              type="button"
              className="row"
              onClick={() => navigate({ to: '/place/$locationId', params: { locationId: l.id } })}
            >
              <span>{resolveText(l.name, contentLanguages)}</span>
              {nearIds.has(l.id) && <em>{t('home.near')}</em>}
            </button>
          )}
        />
      </Body>
      <Foot>
        <nav className="foot-nav">
          <Link to="/book" className="btn">
            {t('home.book')}
          </Link>
          <Link to="/settings" className="btn">
            {t('home.settings')}
          </Link>
        </nav>
      </Foot>
    </Screen>
  )
}
