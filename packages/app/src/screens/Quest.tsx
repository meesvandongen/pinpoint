import { useState, type CSSProperties, type ReactNode } from 'react'
import { Link, useCanGoBack, useNavigate, useParams, useRouter } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import {
  hashString,
  MAX_POINTS,
  playablePins,
  resolveText,
  stampPoints,
  type Category,
  type Pin,
  type Quest,
  type Stamp as StampRecord,
} from 'pinpoint-core'
import { Body, Cover, Foot, Screen } from '../components/layout.tsx'
import { FitGrid } from '../components/FitGrid.tsx'
import { contentQuery } from '../content.ts'
import { useI18n } from '../i18n/index.ts'
import { usePhotoUrls } from '../photos/usePhoto.ts'
import { findStamp, stampedPins, useStamps } from '../state/progress.ts'
import { questStampPropsFor, stampPropsFor } from '../stamps/for-pin.ts'
import { CategoryIcon, PointStamp, QuestStamp, Stamp } from '../stamps/Stamp.tsx'
import { shortDate } from '../stamps/svg.ts'
import { NotFound } from './NotFound.tsx'

/** Width over height of the page every pin is printed on. */
export const SLOT_ASPECT = 1 / 1.17

/**
 * `/quest/$questId`: the one page of a quest. Every pin has its own place in the grid, so nothing moves
 * when a stamp is collected. A pin you can look for opens the clues, one that has to wait shows dimmed,
 * and a pin you found is a page with its stamps pressed on it, covered by your photo when you took one.
 */
export function QuestOverview() {
  const { questId } = useParams({ from: '/app/quest/$questId' })
  const { data: content } = useSuspenseQuery(contentQuery)
  const quest = content.quests.find((q) => q.id === questId)
  if (!quest) return <NotFound />
  return <Overview quest={quest} />
}

type Cell = { kind: 'pin'; index: number } | { kind: 'quest' }

function Overview({ quest }: { quest: Quest }) {
  const i18n = useI18n()
  const { t, contentLanguages } = i18n
  const router = useRouter()
  const navigate = useNavigate()
  const canGoBack = useCanGoBack()
  const stamps = useStamps()
  const photoUrls = usePhotoUrls(quest.id)
  const [lifted, setLifted] = useState<string>()
  const tr = (text: Parameters<typeof resolveText>[0]) =>
    resolveText(text, contentLanguages, quest.defaultLanguage)

  const stamped = stampedPins(stamps, quest.id)
  const playable = new Set(playablePins(quest, stamped).map((p) => p.id))
  const complete = stamped.size >= quest.pins.length
  const cells: Cell[] = [
    ...quest.pins.map((_, index): Cell => ({ kind: 'pin', index })),
    ...(complete ? [{ kind: 'quest' } as Cell] : []),
  ]

  return (
    <Screen className="overview">
      <Cover
        title={tr(quest.title)}
        subtitle={t('quests.progress', {
          done: Math.min(stamped.size, quest.pins.length),
          total: quest.pins.length,
        })}
      >
        <button
          type="button"
          className="back"
          onClick={() => (canGoBack ? router.history.back() : void navigate({ to: '/' }))}
        >
          ‹ {t('common.back')}
        </button>
      </Cover>
      <Body className="overview-body">
        <FitGrid
          items={cells}
          aspect={SLOT_ASPECT}
          label={tr(quest.title)}
          keyOf={(c) => (c.kind === 'quest' ? 'quest' : quest.pins[c.index].id)}
          render={(cell) => {
            if (cell.kind === 'quest') return <QuestSlot quest={quest} />
            const pin = quest.pins[cell.index]
            const stamp = findStamp(stamps, quest.id, pin.id)
            const props = { quest, pin, number: cell.index + 1, title: tr(pin.title) }
            if (stamp) {
              return (
                <FoundSlot
                  {...props}
                  stamp={stamp}
                  photo={stamp.photo ? photoUrls[pin.id] : undefined}
                  lifted={lifted === pin.id}
                  onToggle={() => setLifted(lifted === pin.id ? undefined : pin.id)}
                />
              )
            }
            return playable.has(pin.id) ? <OpenSlot {...props} /> : <LockedSlot {...props} />
          }}
        />
      </Body>
      <Foot>
        {complete && (
          <Link to="/quest/$questId/done" params={{ questId: quest.id }} className="btn primary">
            {t('book.openCollage')}
          </Link>
        )}
      </Foot>
    </Screen>
  )
}

type PinProps = { quest: Quest; pin: Pin; number: number; title: string }

/** The printed page every pin starts as: its number, its icon and its name. */
function Paper({
  number,
  title,
  category,
  children,
}: {
  number: number
  title: string
  category: Category
  children?: ReactNode
}) {
  const { t } = useI18n()
  return (
    <div className="paper">
      <span className="paper-no">{t('book.pin', { n: number })}</span>
      <span className="paper-icon">
        <CategoryIcon category={category} size={54} />
      </span>
      {children}
      <span className="paper-name">{title}</span>
    </div>
  )
}

/** A pin you can look for now. */
function OpenSlot({ quest, pin, number, title }: PinProps) {
  const { t } = useI18n()
  return (
    <Link
      to="/quest/$questId/find/$pinId"
      params={{ questId: quest.id, pinId: pin.id }}
      className="slot open"
      aria-label={t('quest.find', { title })}
    >
      <Paper number={number} title={title} category={pin.category} />
    </Link>
  )
}

/** A pin that has to wait for the ones before it. Visible, not tappable. */
function LockedSlot({ pin, number, title }: PinProps) {
  const { t } = useI18n()
  return (
    <div className="slot locked" role="img" aria-label={t('quest.locked', { title })}>
      <Paper number={number} title={title} category={pin.category} />
      <svg
        className="lock"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="5" y="11" width="14" height="9" rx="2" />
        <path d="M8 11V8a4 4 0 0 1 8 0v3" />
      </svg>
    </div>
  )
}

/** A pin you found: the stamp and the points pressed on the page, with your photo taped over them. */
function FoundSlot({
  quest,
  pin,
  number,
  title,
  stamp,
  photo,
  lifted,
  onToggle,
}: PinProps & {
  stamp: StampRecord
  photo: string | undefined
  lifted: boolean
  onToggle: () => void
}) {
  const i18n = useI18n()
  const { t } = i18n
  const seed = hashString(`${quest.id}/${pin.id}`)
  const points = stampPoints(stamp)
  const offset = {
    '--dx': (seed % 15) - 7,
    '--dy': ((seed >> 4) % 11) - 5,
  } as CSSProperties
  const covered = photo !== undefined && !lifted
  return (
    <div className={`slot found${photo ? ' photo' : ''}${lifted ? ' lifted' : ''}`}>
      <Paper number={number} title={title} category={pin.category}>
        <span className="ink paper-stamp" style={offset}>
          <Stamp stamp={stampPropsFor(quest, pin, stamp, i18n)} />
        </span>
        {points > 0 && (
          <span
            className="points"
            role="img"
            aria-label={t('quest.points', { n: points, max: MAX_POINTS })}
          >
            {Array.from({ length: points }, (_, i) => (
              <PointStamp key={i} seed={`${quest.id}/${pin.id}`} index={i} />
            ))}
          </span>
        )}
      </Paper>
      <Link
        to="/book/$questId/$pinId"
        params={{ questId: quest.id, pinId: pin.id }}
        className="hit"
        aria-label={t('quest.open', { title })}
        // The photo covers the page, so the page is only reachable once the photo is lifted.
        inert={covered}
      />
      {photo && (
        <button
          type="button"
          className="flap"
          style={{ '--tilt': `${(seed % 5) - 2}deg` } as CSSProperties}
          aria-expanded={lifted}
          aria-label={t('quest.showStamps', { title })}
          onClick={onToggle}
        >
          <span className="polaroid-card">
            <i className="tape" />
            <span className="photo">
              <img src={photo} alt="" />
            </span>
            <span className="hand">{title}</span>
          </span>
          <span className="polaroid-back">
            <span>{shortDate(stamp.at)}</span>
          </span>
        </button>
      )}
    </div>
  )
}

/** The last page of a finished quest, with the quest stamp on it. It opens the collage. */
function QuestSlot({ quest }: { quest: Quest }) {
  const i18n = useI18n()
  const { t, contentLanguages } = i18n
  const stamps = useStamps()
  const title = resolveText(quest.title, contentLanguages, quest.defaultLanguage)
  return (
    <Link
      to="/quest/$questId/done"
      params={{ questId: quest.id }}
      className="slot quest-slot"
      aria-label={t('book.openCollage')}
    >
      <div className="paper">
        <span className="paper-no">★</span>
        <span className="ink paper-stamp">
          <QuestStamp stamp={questStampPropsFor(quest, stamps, i18n)} />
        </span>
        <span className="paper-name">{title}</span>
      </div>
    </Link>
  )
}
