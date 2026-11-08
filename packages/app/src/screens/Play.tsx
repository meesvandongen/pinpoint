import { useEffect, useMemo, useRef, useState, type TouchEvent } from 'react'
import { Navigate, useNavigate, useParams, useSearch } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import {
  arrowRotation,
  bearingDegrees,
  cardinal,
  formatDistance,
  playablePins,
  proximity,
  questsInLocation,
  ringArea,
  resolveClues,
  resolveText,
  skyAt,
  wordLength,
  wordShape,
  type KnownClue,
  type Pin,
  type Quest,
  type Stamp,
} from 'pinpoint-core'
import { Body, Cover, Foot, Screen } from '../components/layout.tsx'
import { contentQuery, mediaUrl } from '../content.ts'
import { useI18n } from '../i18n/index.ts'
import { now, useSkipSeconds } from '../lib/clock.ts'
import { MapClue } from '../map/MapClue.tsx'
import { enableCompass, useCompassEnabled, useHeading } from '../state/heading.ts'
import { retryLocation, startWatching, useFix, useLocationState } from '../state/location.ts'
import { playContext } from '../state/play-context.ts'
import { addStamp, patchStamp, stampedPins, useStamps } from '../state/progress.ts'
import { useSettings } from '../state/settings.ts'
import { isRaining } from '../weather.ts'
import { NotFound } from './NotFound.tsx'

export function Play() {
  const { questId } = useParams({ from: '/app/quest/$questId' })
  const { pin: chosen } = useSearch({ from: '/app/quest/$questId' })
  const { data: content } = useSuspenseQuery(contentQuery)
  const stamps = useStamps()
  // The last pin shown, so checking in at the final pin does not jump to the finish before the arrival pages.
  const shown = useRef<{ pinId: string; openIds: string[] }>(undefined)
  const quest = content.quests.find((q) => q.id === questId)
  if (!quest) return <NotFound />
  const open = playablePins(quest, stampedPins(stamps, quest.id))
  if (open.length > 0) {
    shown.current = { pinId: (open.find((p) => p.id === chosen) ?? open[0]).id, openIds: open.map((p) => p.id) }
  } else if (!shown.current) {
    return <Navigate to="/quest/$questId/done" params={{ questId }} replace />
  }
  const pin = quest.pins.find((p) => p.id === shown.current!.pinId)!
  return <PinScreen key={pin.id} quest={quest} pin={pin} openIds={shown.current.openIds} />
}

/** Seconds since the screen opened, plus whatever the test tools skipped. */
function useElapsed(): number {
  const skip = useSkipSeconds()
  const [real, setReal] = useState(0)
  useEffect(() => {
    const started = Date.now()
    const id = setInterval(() => setReal(Math.floor((Date.now() - started) / 1000)), 1000)
    return () => clearInterval(id)
  }, [])
  return real + skip
}

function PinScreen({ quest, pin, openIds }: { quest: Quest; pin: Pin; openIds: string[] }) {
  const { t, contentLanguages } = useI18n()
  const navigate = useNavigate()
  const { data: content } = useSuspenseQuery(contentQuery)
  const stamps = useStamps()
  const settings = useSettings()
  const location = useLocationState()
  const fix = useFix()
  const heading = useHeading()
  const compassOn = useCompassEnabled()
  const elapsed = useElapsed()
  const [requested, setRequested] = useState<ReadonlySet<number>>(new Set())
  const [deckIndex, setDeckIndex] = useState(0)
  const tr = (text: Parameters<typeof resolveText>[0]) => resolveText(text, contentLanguages, quest.defaultLanguage)

  useEffect(() => {
    playContext.set({ quest, pin })
    return () => playContext.set({})
  }, [quest, pin])

  const states = useMemo(
    () => resolveClues(pin, { elapsedSeconds: elapsed, requested, expert: settings.expert }),
    [pin, elapsed, requested, settings.expert],
  )
  const visible = states.filter((s) => s.visible).map((s) => s.clue as KnownClue)
  const showDistance = visible.some((c) => c.type === 'distance')
  const direction = visible.find((c) => c.type === 'direction') as Extract<KnownClue, { type: 'direction' }> | undefined
  const deck = states.filter((s) => s.clue.type !== 'distance' && s.clue.type !== 'direction')
  const card = deck[Math.min(deckIndex, Math.max(0, deck.length - 1))]

  const prox = fix ? proximity(fix, pin) : undefined
  const arrived = prox?.state === 'arrived'

  // A short buzz when the pin comes within reach, for players who are looking at the street and not the screen.
  useEffect(() => {
    if (arrived) navigator.vibrate?.(60)
  }, [arrived])

  // Back goes to the list the quest came from, not through history: after a stamp the history holds this screen twice.
  const place = content.locations
    .filter((l) => questsInLocation(l, content.quests).some((q) => q.id === quest.id))
    .sort((a, b) => ringArea(a.polygon) - ringArea(b.polygon))[0]

  const swipe = useRef<number>(undefined)
  const onTouchStart = (e: TouchEvent) => {
    swipe.current = (e.target as HTMLElement).closest('.mapview, .areamap, audio') ? undefined : e.touches[0].clientX
  }
  const onTouchEnd = (e: TouchEvent) => {
    if (swipe.current === undefined) return
    const dx = e.changedTouches[0].clientX - swipe.current
    swipe.current = undefined
    if (Math.abs(dx) < 50) return
    setDeckIndex((i) => Math.max(0, Math.min(deck.length - 1, i + (dx < 0 ? 1 : -1))))
  }
  const bearing = fix ? bearingDegrees(fix, pin.position) : undefined
  const stamped = stampedPins(stamps, quest.id)
  const index = quest.pins.findIndex((p) => p.id === pin.id)

  const checkIn = () => {
    if (!fix) return
    const at = now()
    const stamp: Stamp = {
      questId: quest.id,
      pinId: pin.id,
      at: at.toISOString(),
      clues: [...new Set(visible.map((c) => c.type))],
    }
    const sky = skyAt(at, fix)
    if (sky !== 'day') stamp.sky = sky
    addStamp(stamp)
    if (settings.weatherMarks) {
      void isRaining(fix).then((raining) => {
        if (raining) patchStamp(quest.id, pin.id, { weather: 'rain' })
      })
    }
    void navigate({ to: '/quest/$questId/arrived/$pinId', params: { questId: quest.id, pinId: pin.id } })
  }

  let status = t('play.waiting')
  if (prox) {
    status =
      arrived
        ? t('play.here')
        : prox.state === 'near'
          ? t('play.almost')
          : showDistance
            ? t('play.toGo', { distance: formatDistance(prox.distance) })
            : t('play.keepExploring')
  }

  return (
    <Screen className="play">
      <Cover
        title={tr(quest.title)}
        subtitle={t('play.pinOf', { n: index + 1, total: quest.pins.length })}
        after={
          <div className="pins" role="group" aria-label={t('play.pinOf', { n: index + 1, total: quest.pins.length })}>
            {quest.pins.map((p, i) => {
              const isDone = stamped.has(p.id)
              const canPick = quest.order === 'free' && !isDone && openIds.includes(p.id)
              return (
                <button
                  key={p.id}
                  type="button"
                  className={isDone ? 'done' : p.id === pin.id ? 'now' : ''}
                  disabled={!canPick}
                  onClick={() => void navigate({ to: '/quest/$questId', params: { questId: quest.id }, search: { pin: p.id }, replace: true })}
                  aria-label={t('book.pin', { n: i + 1 })}
                  aria-current={p.id === pin.id ? 'step' : undefined}
                >
                  {i + 1}
                </button>
              )
            })}
          </div>
        }
      >
        <button
          type="button"
          className="back"
          onClick={() => void (place ? navigate({ to: '/place/$locationId', params: { locationId: place.id } }) : navigate({ to: '/' }))}
        >
          ‹ {t('play.back')}
        </button>
      </Cover>

      <Body>
        {location.status === 'idle' && !fix ? (
          <div className="card">
            <h2>{t('play.share.title')}</h2>
            <p>{t('play.share.body')}</p>
            <button type="button" className="btn primary" onClick={startWatching}>
              {t('play.share.button')}
            </button>
          </div>
        ) : (
          <>
            {(showDistance || direction) && (
              <div className="compass">
                {showDistance && <div className="dist" data-testid="distance">{prox ? formatDistance(prox.distance) : '…'}</div>}
                {direction && bearing !== undefined && (
                  <div className="dir">
                    {direction.mode === 'cardinal' ? (
                      <span className="card-dir" data-testid="cardinal">{cardinal(bearing)}</span>
                    ) : (
                      <svg viewBox="-28 -28 56 56" width="64" height="64" role="img" aria-label={t('play.directionLabel', { direction: cardinal(bearing) })}>
                        <circle r="25" fill="none" stroke="currentColor" strokeWidth="2" />
                        <g transform={`rotate(${arrowRotation(bearing, heading)})`} data-testid="arrow">
                          <path d="M0-18 L8 12 L0 7 L-8 12Z" fill="var(--needle)" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                        </g>
                      </svg>
                    )}
                    {direction.mode !== 'cardinal' && !compassOn && (
                      <button type="button" className="link" onClick={() => void enableCompass()}>
                        {t('play.points', { direction: cardinal(bearing) })} {t('play.compass')}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {card && (
              <div className="deck" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
                <div className="deck-card" key={card.index}>
                  {card.visible ? (
                    <ClueCard clue={card.clue as KnownClue} pin={pin} quest={quest} />
                  ) : (
                    <div className="locked">
                      <p>
                        {card.lockedBy === 'time'
                          ? t('play.lockedTime', { seconds: Math.max(0, (card.clue.reveal?.afterSeconds ?? 0) - elapsed) })
                          : t('play.lockedRequest')}
                      </p>
                      <button type="button" className="btn" onClick={() => setRequested(new Set([...requested, card.index]))}>
                        {t('play.showNow')}
                      </button>
                    </div>
                  )}
                </div>
                {deck.length > 1 && (
                  <div className="deck-nav">
                    <button type="button" className="turn" disabled={deckIndex === 0} onClick={() => setDeckIndex(deckIndex - 1)} aria-label={t('play.previousClue')}>
                      ‹
                    </button>
                    <span className="pager-dots" role="status" aria-label={t('play.clueNumber', { n: deckIndex + 1, total: deck.length })}>
                      {deck.map((d, i) => (
                        <i key={d.index} className={`${i === deckIndex ? 'on' : ''} ${d.visible ? '' : 'lock'}`} title={d.visible ? undefined : t('play.lockedClue')} />
                      ))}
                    </span>
                    <button type="button" className="turn" disabled={deckIndex >= deck.length - 1} onClick={() => setDeckIndex(deckIndex + 1)} aria-label={t('play.nextClue')}>
                      ›
                    </button>
                  </div>
                )}
              </div>
            )}
            {location.error && (
              <div className="notice">
                <p className="status warn">{t(`location.${location.error}`)}</p>
                {(location.error === 'denied' || location.error === 'unavailable') && (
                  <button type="button" className="btn small" onClick={retryLocation}>
                    {t('location.retry')}
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </Body>

      <Foot>
        <p className="status" role="status" data-testid="status">{status}</p>
        <button type="button" className={`btn primary ${arrived ? 'ready' : ''}`} disabled={!arrived} onClick={checkIn}>
          {t('play.checkIn')}
        </button>
      </Foot>
    </Screen>
  )
}


function ClueCard({ clue, pin, quest }: { clue: KnownClue; pin: Pin; quest: Quest }) {
  const { t, contentLanguages } = useI18n()
  const fix = useFix()
  const tr = (text: Parameters<typeof resolveText>[0]) => resolveText(text, contentLanguages, quest.defaultLanguage)
  switch (clue.type) {
    case 'text':
      return <p className="clue-text">“{tr(clue.text)}”</p>
    case 'photo':
      return <img className="clue-photo" src={mediaUrl(clue.src)} alt={clue.alt ? tr(clue.alt) : ''} />
    case 'audio':
      return (
        <div className="clue-audio">
          <audio controls src={mediaUrl(clue.src)} aria-label={t('play.audio')} />
          {clue.caption && <small>{tr(clue.caption)}</small>}
        </div>
      )
    case 'wordShape': {
      const word = tr(clue.word)
      return (
        <div className="clue-word" role="img" aria-label={t('play.letters', { n: wordLength(word) })}>
          <div className="cells">
            {wordShape(word, clue.showFirstLetter).map((cell, i) =>
              cell.char === ' ' ? (
                <span key={i} className="gap" />
              ) : (
                <span key={i} className={cell.known ? 'cell known' : 'cell'}>
                  {cell.char === '_' ? '' : cell.char}
                </span>
              ),
            )}
          </div>
          <small>{t('play.letters', { n: wordLength(word) })}</small>
        </div>
      )
    }
    case 'map':
      return <MapClue pin={pin} fix={fix} view={clue.view} />
    default:
      return null
  }
}
