import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { Link, useParams } from '@tanstack/react-router'
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
import { BackButton } from '../components/BackButton.tsx'
import { Body, Cover, Foot, Screen } from '../components/layout.tsx'
import { FitGrid } from '../components/FitGrid.tsx'
import { contentQuery } from '../content.ts'
import { useI18n } from '../i18n/index.ts'
import { placeOf } from '../lib/place.ts'
import { usePhotoUrls } from '../photos/usePhoto.ts'
import { LANDING_TTL_MS, landed, useLanding } from '../state/landing.ts'
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

/** How long the stamp, the stars and the photo take to land, in milliseconds. Matches the CSS below `.landing`. */
const LANDING_MS = 3400
/** When the rubber stamp touches the page. */
const CONTACT_MS = 520

const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * The pin just finished, if it belongs to this quest: its page plays the stamp, the stars and the photo onto
 * itself once, and then the landing is cleared, so coming back later shows the page as it is.
 */
function useLandingPin(questId: string): string | undefined {
  const landing = useLanding()
  const [fresh] = useState(() => landing !== undefined && Date.now() - landing.at < LANDING_TTL_MS)
  const pinId = fresh && landing?.questId === questId ? landing.pinId : undefined
  useEffect(() => {
    if (!pinId) return
    if (reducedMotion()) {
      landed()
      return
    }
    const buzz = setTimeout(() => navigator.vibrate?.(35), CONTACT_MS)
    const done = setTimeout(landed, LANDING_MS)
    return () => {
      clearTimeout(buzz)
      clearTimeout(done)
    }
  }, [pinId])
  return pinId
}

function Overview({ quest }: { quest: Quest }) {
  const i18n = useI18n()
  const { t, contentLanguages } = i18n
  const { data: content } = useSuspenseQuery(contentQuery)
  const stamps = useStamps()
  const photoUrls = usePhotoUrls(quest.id)
  const [lifted, setLifted] = useState<string>()
  const landingPin = useLandingPin(quest.id)
  const tr = (text: Parameters<typeof resolveText>[0]) =>
    resolveText(text, contentLanguages, quest.defaultLanguage)

  const stamped = stampedPins(stamps, quest.id)
  const playable = new Set(playablePins(quest, stamped).map((p) => p.id))
  const complete = stamped.size >= quest.pins.length
  const nextPin = playablePins(quest, stamped)[0]
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
        home
      >
        <BackButton
          label={t('common.back')}
          fallback={(go) => {
            const place = placeOf(content.locations, content.quests, quest)
            void (place ? go({ to: '/place/$locationId', params: { locationId: place.id } }) : go({ to: '/' }))
          }}
        />
      </Cover>
      <Body className="overview-body">
        <FitGrid
          items={cells}
          aspect={SLOT_ASPECT}
          label={tr(quest.title)}
          focusIndex={landingPin ? quest.pins.findIndex((p) => p.id === landingPin) : undefined}
          keyOf={(c) => (c.kind === 'quest' ? 'quest' : quest.pins[c.index].id)}
          render={(cell) => {
            if (cell.kind === 'quest') return <QuestSlot quest={quest} late={landingPin !== undefined} />
            const pin = quest.pins[cell.index]
            const stamp = findStamp(stamps, quest.id, pin.id)
            const props = { quest, pin, number: cell.index + 1, title: tr(pin.title) }
            if (stamp) {
              return (
                <FoundSlot
                  {...props}
                  stamp={stamp}
                  photo={stamp.photo ? photoUrls[pin.id] : undefined}
                  landing={landingPin === pin.id}
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
        {complete ? (
          <Link to="/quest/$questId/done" params={{ questId: quest.id }} className="btn primary">
            {t('book.openCollage')}
          </Link>
        ) : (
          nextPin && (
            <Link to="/quest/$questId/find/$pinId" params={{ questId: quest.id, pinId: nextPin.id }} className="btn primary">
              {stamped.size > 0 ? t('quest.continue') : t('quest.start')}
            </Link>
          )
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

/**
 * A pin you found: the stamp and the stars pressed on the page, with your photo taped over them. Right after
 * the pin is finished (`landing`), a rubber stamp comes down and inks the page, the stars are pressed one by
 * one, and the photo is laid on and taped.
 */
function FoundSlot({
  quest,
  pin,
  number,
  title,
  stamp,
  photo,
  landing,
  lifted,
  onToggle,
}: PinProps & {
  stamp: StampRecord
  photo: string | undefined
  landing: boolean
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
  const props = stampPropsFor(quest, pin, stamp, i18n)
  return (
    <div className={`slot found${photo ? ' photo' : ''}${lifted ? ' lifted' : ''}${landing ? ' landing' : ''}`}>
      <Paper number={number} title={title} category={pin.category}>
        <span className="ink paper-stamp" style={offset}>
          <Stamp stamp={props} />
        </span>
        {points > 0 && (
          <span
            className="points"
            role="img"
            aria-label={t('quest.points', { n: points, max: MAX_POINTS })}
          >
            {Array.from({ length: points }, (_, i) => (
              <PointStamp key={i} seed={`${quest.id}/${pin.id}`} index={i} className={`point-${i}`} />
            ))}
          </span>
        )}
      </Paper>
      {landing && <Stamper ink={props.ink} offset={offset} />}
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

/** The rubber stamp that comes down on a page: a wooden handle and a block with the ink on its face. */
function Stamper({ ink, offset }: { ink: string; offset: CSSProperties }) {
  return (
    <span className="stamper" style={offset} aria-hidden="true">
      <svg viewBox="0 0 100 120">
        <defs>
          <linearGradient id="stamper-wood" x1="0" x2="1">
            <stop offset="0" stopColor="#8a5a2b" />
            <stop offset="0.45" stopColor="#c08a52" />
            <stop offset="1" stopColor="#6e4521" />
          </linearGradient>
        </defs>
        <ellipse cx="50" cy="20" rx="17" ry="15" fill="url(#stamper-wood)" />
        <rect x="42" y="30" width="16" height="34" rx="4" fill="url(#stamper-wood)" />
        <rect x="14" y="62" width="72" height="34" rx="5" fill="url(#stamper-wood)" />
        <rect x="14" y="62" width="72" height="6" rx="3" fill="#000" opacity="0.15" />
        <rect x="11" y="94" width="78" height="10" rx="2" fill={ink} />
        <rect x="11" y="94" width="78" height="3" fill="#000" opacity="0.2" />
      </svg>
    </span>
  )
}

/** The last page of a finished quest, with the quest stamp on it. It opens the collage. `late` waits for the last pin's stamp to land first. */
function QuestSlot({ quest, late = false }: { quest: Quest; late?: boolean }) {
  const i18n = useI18n()
  const { t, contentLanguages } = i18n
  const stamps = useStamps()
  const title = resolveText(quest.title, contentLanguages, quest.defaultLanguage)
  return (
    <Link
      to="/quest/$questId/done"
      params={{ questId: quest.id }}
      className={`slot quest-slot${late ? ' late' : ''}`}
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
