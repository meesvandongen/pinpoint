import { useEffect, useMemo, useRef, useState } from 'react'
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
import { useI18n, type MessageKey } from '../i18n/index.ts'
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
  const [picked, setPicked] = useState<number>()
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
  // The clues you hold are a row of tabs. A clue you do not hold yet is never browsable: there is only ever one
  // "next clue", with a countdown or a button.
  const held = states.filter((s) => s.visible && s.clue.type !== 'distance' && s.clue.type !== 'direction')
  const next = states.find((s) => !s.visible)
  const heldKey = held.map((s) => s.index).join()
  const [seen, setSeen] = useState<ReadonlySet<number>>(() => new Set(held.map((s) => s.index)))
  useEffect(() => {
    // A clue that opens by itself becomes the one on show.
    const fresh = held.find((s) => !seen.has(s.index))
    if (!fresh) return
    setSeen(new Set(held.map((s) => s.index)))
    setPicked(fresh.index)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [heldKey])
  const card = held.find((s) => s.index === picked) ?? held[0]
  const reveal = (index: number) => setRequested((r) => new Set([...r, index]))

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
            ? t('play.getClose', { distance: formatDistance(pin.radius) })
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

            {held.length > 1 && (
              <div className="clue-tabs" role="tablist" aria-label={t('play.yourClues')}>
                {held.map((c, i) => (
                  <button key={c.index} type="button" role="tab" aria-selected={c === card} className={c === card ? 'on' : ''} onClick={() => setPicked(c.index)}>
                    {i + 1} · {t(`play.clue.${c.clue.type}` as MessageKey)}
                  </button>
                ))}
              </div>
            )}

            {card && (
              <div className="deck">
                <div className="deck-card" key={card.index} role="tabpanel">
                  <ClueCard clue={card.clue as KnownClue} pin={pin} quest={quest} />
                </div>
              </div>
            )}

            {next && (
              <div className="next-clue">
                {next.lockedBy === 'time' ? (
                  <>
                    <span role="timer">{t('play.next.wait', { seconds: Math.max(0, (next.clue.reveal?.afterSeconds ?? 0) - elapsed) })}</span>
                    <button type="button" className="btn small" onClick={() => reveal(next.index)}>
                      {t('play.next.now')}
                    </button>
                  </>
                ) : (
                  <button type="button" className="btn small" onClick={() => reveal(next.index)}>
                    {t('play.next.ask')}
                  </button>
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
