import { useState } from 'react'
import { Link, useNavigate, useParams } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { extrasOf, resolveText, type Quest } from 'pinpoint-core'
import { Body, Cover, Foot, Screen } from '../components/layout.tsx'
import { Pager } from '../components/Pager.tsx'
import { contentQuery } from '../content.ts'
import { useI18n } from '../i18n/index.ts'
import { usePhotoUrl, usePhotoUrls } from '../photos/usePhoto.ts'
import { findStamp, stampedPins, useStamps } from '../state/progress.ts'
import { stampPropsFor, questStampPropsFor } from '../stamps/for-pin.ts'
import { ExtraMark, QuestStamp, Stamp } from '../stamps/Stamp.tsx'
import { NotFound } from './NotFound.tsx'
import { QUEST_HEIGHT } from './Quests.tsx'

const SLOT_HEIGHT = 150
const PHOTO_HEIGHT = 190

/** `/book`: every quest the player has stamps in. */
export function BookIndex() {
  const { data: content } = useSuspenseQuery(contentQuery)
  const { t, contentLanguages } = useI18n()
  const navigate = useNavigate()
  const stamps = useStamps()
  const started = content.quests.filter((q) => stampedPins(stamps, q.id).size > 0)
  return (
    <Screen>
      <Cover title={t('book.title')}>
        <Link to="/" className="back">
          ‹ {t('common.back')}
        </Link>
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
              <button type="button" className="quest" onClick={() => navigate({ to: '/book/$questId', params: { questId: q.id } })}>
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

/** `/book/$questId`: the stamps and the photos of one quest, a page at a time. */
export function BookQuest() {
  const { questId } = useParams({ from: '/app/book/$questId' })
  const { data: content } = useSuspenseQuery(contentQuery)
  const i18n = useI18n()
  const { t, contentLanguages } = i18n
  const navigate = useNavigate()
  const stamps = useStamps()
  const photoUrls = usePhotoUrls(questId)
  const [tab, setTab] = useState<'stamps' | 'photos'>('stamps')
  const quest = content.quests.find((q) => q.id === questId)
  if (!quest) return <NotFound />
  const tr = (text: Parameters<typeof resolveText>[0]) => resolveText(text, contentLanguages, quest.defaultLanguage)
  const complete = stampedPins(stamps, quest.id).size >= quest.pins.length
  const open = (pinId: string) => navigate({ to: '/book/$questId/$pinId', params: { questId: quest.id, pinId } })

  type Slot = { kind: 'pin'; index: number } | { kind: 'quest' }
  const slots: Slot[] = [...quest.pins.map((_, index): Slot => ({ kind: 'pin', index })), ...(complete ? [{ kind: 'quest' } as Slot] : [])]
  const withPhotos = quest.pins.filter((p) => photoUrls[p.id])

  return (
    <Screen>
      <Cover title={tr(quest.title)} subtitle={t('quests.progress', { done: stampedPins(stamps, quest.id).size, total: quest.pins.length })}>
        <Link to="/book" className="back">
          ‹ {t('book.back')}
        </Link>
      </Cover>
      <Body>
        <div className="tabs" role="tablist">
          {(['stamps', 'photos'] as const).map((name) => (
            <button key={name} type="button" role="tab" aria-selected={tab === name} className={tab === name ? 'on' : ''} onClick={() => setTab(name)}>
              {t(`book.${name}`)}
            </button>
          ))}
        </div>
        {tab === 'stamps' ? (
          <Pager
            items={slots}
            rowHeight={SLOT_HEIGHT}
            columns={2}
            label={t('book.stamps')}
            keyOf={(s) => (s.kind === 'quest' ? 'quest' : quest.pins[s.index].id)}
            render={(slot) => {
              if (slot.kind === 'quest') {
                return (
                  <Link to="/quest/$questId/done" params={{ questId: quest.id }} className="slot" aria-label={t('book.openCollage')}>
                    <QuestStamp stamp={questStampPropsFor(quest, stamps, i18n)} />
                  </Link>
                )
              }
              const pin = quest.pins[slot.index]
              const stamp = findStamp(stamps, quest.id, pin.id)
              return stamp ? (
                <button type="button" className="slot" onClick={() => void open(pin.id)} aria-label={tr(pin.title)}>
                  <Stamp stamp={stampPropsFor(quest, pin, stamp, i18n)} />
                </button>
              ) : (
                <div className="slot empty" aria-label={`${t('book.pin', { n: slot.index + 1 })}: ${t('book.noStamps')}`}>
                  {slot.index + 1}
                </div>
              )
            }}
          />
        ) : withPhotos.length === 0 ? (
          <p className="status">{t('book.noPhotos')}</p>
        ) : (
          <Pager
            items={withPhotos}
            rowHeight={PHOTO_HEIGHT}
            columns={2}
            label={t('book.photos')}
            keyOf={(p) => p.id}
            render={(pin) => (
              <button type="button" className="mini-polaroid" onClick={() => void open(pin.id)}>
                <img src={photoUrls[pin.id]} alt="" />
                <span>{tr(pin.title)}</span>
              </button>
            )}
          />
        )}
      </Body>
      <Foot>
        {complete ? (
          <Link to="/quest/$questId/done" params={{ questId: quest.id }} className="btn primary">
            {t('book.openCollage')}
          </Link>
        ) : (
          <Link to="/quest/$questId" params={{ questId: quest.id }} className="btn">
            {t('play.back')}
          </Link>
        )}
      </Foot>
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
        <Link to="/book/$questId" params={{ questId }} className="back">
          ‹ {tr(quest.title)}
        </Link>
      </Cover>
      <Body className="book-pin-body">
        <Stamp className="detail-stamp" stamp={stampPropsFor(quest, pin, stamp, i18n)} />
        {photo && stamp.photo && (
          <div className="polaroid small">
            <div className="polaroid-photo">
              <img src={photo} alt="" />
            </div>
          </div>
        )}
        {extras.length > 0 && (
          <ul className="extras-list">
            {extras.map((extra) => (
              <li key={extra}>
                <ExtraMark extra={extra} label={t(`extra.${extra}`)} seed={`${quest.id}/${pin.id}`} />
                <span>{extra === 'quiz' ? (stamp.quiz === 'correct' ? t('book.quizCorrect') : t('book.quizWrong')) : t(`extra.${extra}`)}</span>
              </li>
            ))}
          </ul>
        )}
      </Body>
      <div className="foot" />
    </Screen>
  )
}
