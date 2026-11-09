import { Link, useNavigate, useParams } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { extrasOf, resolveText, type Quest } from 'pinpoint-core'
import { BackButton } from '../components/BackButton.tsx'
import { Body, Cover, Screen } from '../components/layout.tsx'
import { Pager } from '../components/Pager.tsx'
import { contentQuery } from '../content.ts'
import { useI18n } from '../i18n/index.ts'
import { usePhotoUrl } from '../photos/usePhoto.ts'
import { findStamp, stampedPins, useStamps } from '../state/progress.ts'
import { stampPropsFor } from '../stamps/for-pin.ts'
import { ExtraMark, Stamp } from '../stamps/Stamp.tsx'
import { NotFound } from './NotFound.tsx'
import { QUEST_HEIGHT } from './Quests.tsx'

/** `/book`: every quest the player has stamps in. Each opens the quest page. */
export function BookIndex() {
  const { data: content } = useSuspenseQuery(contentQuery)
  const { t, contentLanguages } = useI18n()
  const navigate = useNavigate()
  const stamps = useStamps()
  const started = content.quests.filter((q) => stampedPins(stamps, q.id).size > 0)
  return (
    <Screen>
      <Cover title={t('book.title')}>
        <BackButton label={t('common.back')} fallback={(go) => void go({ to: '/' })} />
      </Cover>
      <Body>
        {started.length === 0 ? (
          <div className="card">
            <h2>{t('book.empty.title')}</h2>
            <p>{t('book.empty.body')}</p>
          </div>
        ) : (
          <Pager
            items={started}
            rowHeight={QUEST_HEIGHT - 28}
            label={t('book.title')}
            keyOf={(q) => q.id}
            render={(q) => (
              <button type="button" className="quest" onClick={() => navigate({ to: '/quest/$questId', params: { questId: q.id } })}>
                <strong>{resolveText(q.title, contentLanguages, q.defaultLanguage)}</strong>
                <span>{t('quests.progress', { done: stampedPins(stamps, q.id).size, total: q.pins.length })}</span>
              </button>
            )}
          />
        )}
      </Body>
      <div className="foot" />
    </Screen>
  )
}

/** `/book/$questId/$pinId`: one stamp, large, with its marks and photo. */
export function BookPin() {
  const { questId, pinId } = useParams({ from: '/app/book/$questId/$pinId' })
  const { data: content } = useSuspenseQuery(contentQuery)
  const i18n = useI18n()
  const { t, contentLanguages } = i18n
  const stamps = useStamps()
  const quest: Quest | undefined = content.quests.find((q) => q.id === questId)
  const pin = quest?.pins.find((p) => p.id === pinId)
  const stamp = findStamp(stamps, questId, pinId)
  const photo = usePhotoUrl(questId, pinId)
  if (!quest || !pin || !stamp) return <NotFound />
  const tr = (text: Parameters<typeof resolveText>[0]) => resolveText(text, contentLanguages, quest.defaultLanguage)
  const extras = extrasOf(stamp)
  return (
    <Screen className="book-pin">
      <Cover title={tr(pin.title)} subtitle={t('book.arrived', { date: i18n.formatDate(stamp.at) })}>
        <Link to="/quest/$questId" params={{ questId }} className="back">
          ‹ {tr(quest.title)}
        </Link>
      </Cover>
      <Body className="book-pin-body">
        <div className="pin-top">
          <Stamp className="detail-stamp" stamp={stampPropsFor(quest, pin, stamp, i18n)} />
          {photo && stamp.photo && (
            <div className="polaroid small">
              <div className="polaroid-photo">
                <img src={photo} alt="" />
              </div>
            </div>
          )}
        </div>
        {extras.length > 0 && (
          <ul className="extras-list">
            {extras.map((extra) => (
              <li key={extra}>
                <ExtraMark extra={extra} label={t(`extra.${extra}`)} seed={`${quest.id}/${pin.id}`} />
                <span>{extra === 'quiz' ? t('book.quiz', { right: Object.values(stamp.quiz ?? {}).filter((a) => a === 'correct').length, n: Object.keys(stamp.quiz ?? {}).length }) : t(`extra.${extra}`)}</span>
              </li>
            ))}
          </ul>
        )}
      </Body>
      <div className="foot" />
    </Screen>
  )
}
