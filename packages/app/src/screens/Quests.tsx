import { useNavigate, useParams } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { questsInLocation, resolveText } from 'pinpoint-core'
import { BackButton } from '../components/BackButton.tsx'
import { Body, Cover, Screen } from '../components/layout.tsx'
import { Pager } from '../components/Pager.tsx'
import { contentQuery } from '../content.ts'
import { useI18n } from '../i18n/index.ts'
import { stampedPins, useStamps } from '../state/progress.ts'
import { NotFound } from './NotFound.tsx'

export const QUEST_HEIGHT = 104

export function Quests() {
  const { locationId } = useParams({ from: '/app/place/$locationId' })
  const { data: content } = useSuspenseQuery(contentQuery)
  const { t, tp, contentLanguages } = useI18n()
  const navigate = useNavigate()
  const stamps = useStamps()
  const location = content.locations.find((l) => l.id === locationId)
  if (!location) return <NotFound />
  const quests = questsInLocation(location, content.quests)

  return (
    <Screen>
      <Cover title={resolveText(location.name, contentLanguages)} subtitle={tp('quests.count', quests.length)}>
        <BackButton label={t('quests.back')} fallback={(go) => void go({ to: '/' })} />
      </Cover>
      <Body>
        {quests.length === 0 ? (
          <div className="card">
            <h2>{t('quests.none.title')}</h2>
            <p>{t('quests.none.body')}</p>
          </div>
        ) : (
          <Pager
            items={quests}
            rowHeight={QUEST_HEIGHT}
            label={t('home.places')}
            keyOf={(q) => q.id}
            render={(q) => {
              const done = Math.min(stampedPins(stamps, q.id).size, q.pins.length)
              const complete = done >= q.pins.length
              return (
                <button type="button" className="quest" onClick={() => navigate({ to: '/quest/$questId', params: { questId: q.id } })}>
                  <strong>
                    {resolveText(q.title, contentLanguages, q.defaultLanguage)}
                    {(complete || done > 0) && <em className={complete ? 'badge done' : 'badge'}>{complete ? `✓ ${t('quests.complete')}` : t('quests.started')}</em>}
                  </strong>
                  <span>
                    {t('quests.progress', { done, total: q.pins.length })} ·{' '}
                    {q.order === 'linear' ? t('quests.order.linear') : t('quests.order.free')}
                  </span>
                  {q.description && <small>{resolveText(q.description, contentLanguages, q.defaultLanguage)}</small>}
                </button>
              )
            }}
          />
        )}
      </Body>
      <div className="foot" />
    </Screen>
  )
}
