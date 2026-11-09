import { useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate, useParams } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import {
  arrowRotation,
  ASSISTIVE_TYPES,
  bearingDegrees,
  cardinal,
  formatDistance,
  MAX_POINTS,
  playablePins,
  proximity,
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
import { BackButton } from '../components/BackButton.tsx'
import { costsPoint, HintBadge, Points } from '../components/HintIcon.tsx'
import { Body, Cover, Foot, Screen } from '../components/layout.tsx'
import { contentQuery, mediaUrl } from '../content.ts'
import { useI18n, type MessageKey } from '../i18n/index.ts'
import { now } from '../lib/clock.ts'
import { MapClue } from '../map/MapClue.tsx'
import { enableCompass, useCompassEnabled, useHeading } from '../state/heading.ts'
import { retryLocation, startWatching, useFix, useLocationState } from '../state/location.ts'
import { playContext } from '../state/play-context.ts'
import { addStamp, patchStamp, stampedPins, useStamps } from '../state/progress.ts'
import { useSettings } from '../state/settings.ts'
import { isRaining } from '../weather.ts'
import { NotFound } from './NotFound.tsx'

export function Play() {
  const { questId, pinId } = useParams({ from: '/app/quest/$questId/find/$pinId' })
  const { data: content } = useSuspenseQuery(contentQuery)
  const stamps = useStamps()
  const quest = content.quests.find((q) => q.id === questId)
  const pin = quest?.pins.find((p) => p.id === pinId)
  // Decided once, when the screen opens: checking in stamps the pin, which must not send the player away
  // before the arrival pages.
  const [allowed] = useState(() => !!quest && !!pin && playablePins(quest, stampedPins(stamps, quest.id)).some((p) => p.id === pin.id))
  if (!quest || !pin) return <NotFound />
  if (!allowed) return <Navigate to="/quest/$questId" params={{ questId }} replace />
  return <PinScreen quest={quest} pin={pin} />
}

function PinScreen({ quest, pin }: { quest: Quest; pin: Pin }) {
  const { t, contentLanguages } = useI18n()
  const navigate = useNavigate()
  const stamps = useStamps()
  const settings = useSettings()
  const location = useLocationState()
  const fix = useFix()
  const heading = useHeading()
  const compassOn = useCompassEnabled()
  const [requested, setRequested] = useState<ReadonlySet<number>>(new Set())
  const [picked, setPicked] = useState<number>()
  const tr = (text: Parameters<typeof resolveText>[0]) => resolveText(text, contentLanguages, quest.defaultLanguage)

  useEffect(() => {
    playContext.set({ quest, pin })
    return () => playContext.set({})
  }, [quest, pin])

  const states = useMemo(
    () => resolveClues(pin, { requested, expert: settings.expert }),
    [pin, requested, settings.expert],
  )
  const visible = states.filter((s) => s.visible).map((s) => s.clue as KnownClue)
  const showDistance = visible.some((c) => c.type === 'distance')
  const direction = visible.find((c) => c.type === 'direction') as Extract<KnownClue, { type: 'direction' }> | undefined
  // The hints you hold are a row of tabs. A hint you do not hold yet cannot be browsed: there is only ever one
  // button, and it opens the next one.
  const isReading = (type: string) => type === 'distance' || type === 'direction'
  const held = states.filter((s) => s.visible && !isReading(s.clue.type))
  const next = states.find((s) => !s.visible)
  const hintsLeft = states.filter((s) => !s.visible).length
  const card = held.find((s) => s.index === picked) ?? held[0]
  const spent = new Set<string>(visible.map((c) => c.type))
  const pointsLeft = MAX_POINTS - ASSISTIVE_TYPES.filter((type) => spent.has(type)).length
  const reveal = (state: (typeof states)[number]) => {
    setRequested((r) => new Set([...r, state.index]))
    // The tap that asks for the compass is also what lets a phone that wants permission turn it on.
    if (state.clue.type === 'direction') void enableCompass()
    // The new hint is the one on show.
    else if (!isReading(state.clue.type)) setPicked(state.index)
  }

  const prox = fix ? proximity(fix, pin) : undefined
  const arrived = prox?.state === 'arrived'

  // A short buzz when the pin comes within reach, for players who are looking at the street and not the screen.
  useEffect(() => {
    if (arrived) navigator.vibrate?.(60)
  }, [arrived])

  // Where a phone does not ask permission, the compass just works; where it does, the tap that asked for the hint (or a tap on the dial) starts it.
  const hasCompass = visible.some((c) => c.type === 'direction')
  useEffect(() => {
    const ctor = (globalThis as { DeviceOrientationEvent?: { requestPermission?: unknown } }).DeviceOrientationEvent
    if (hasCompass && !compassOn && typeof ctor?.requestPermission !== 'function') void enableCompass()
  }, [hasCompass, compassOn])

  const bearing = fix ? bearingDegrees(fix, pin.position) : undefined
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
    // Replaces this screen: the pin is stamped, so Back from the arrival pages must not lead here again.
    void navigate({ to: '/quest/$questId/arrived/$pinId', params: { questId: quest.id, pinId: pin.id }, replace: true, state: { fromPin: true } as never })
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
        home
        after={
          <div className="cover-meta">
            <span>{t('play.pinOf', { n: index + 1, total: quest.pins.length })}</span>
            <Points left={pointsLeft} max={MAX_POINTS} label={t('play.pointsLeft', { n: pointsLeft, max: MAX_POINTS })} />
          </div>
        }
      >
        <BackButton label={t('play.back')} fallback={(go) => void go({ to: '/quest/$questId', params: { questId: quest.id } })} />
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
                {showDistance && (
                  <div className="reading">
                    <HintBadge type="distance" size={34} />
                    <div className="dist" data-testid="distance">{prox ? formatDistance(prox.distance) : '…'}</div>
                  </div>
                )}
                {direction && bearing !== undefined && (
                  <button
                    type="button"
                    className={`dial ${compassOn ? 'live' : ''}`}
                    onClick={() => void enableCompass()}
                    aria-label={t('play.directionLabel', { direction: cardinal(bearing) })}
                  >
                    <svg viewBox="-30 -30 60 60" width="72" height="72" aria-hidden="true">
                      <circle r="27" fill="var(--paper-3)" stroke="currentColor" strokeWidth="2" strokeDasharray={compassOn ? undefined : '3 3'} />
                      <text y="-17.5" textAnchor="middle" className="dial-n">N</text>
                      <g transform={`rotate(${arrowRotation(bearing, heading)})`} data-testid="arrow">
                        <path d="M0-16 L7 11 L0 6 L-7 11Z" fill="var(--needle)" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                      </g>
                    </svg>
                    <HintBadge type="direction" size={26} />
                  </button>
                )}
              </div>
            )}

            {held.length > 1 && (
              <div className="clue-tabs" role="tablist" aria-label={t('play.yourHints')}>
                {held.map((c) => (
                  <button key={c.index} type="button" role="tab" aria-selected={c === card} className={c === card ? 'on' : ''} onClick={() => setPicked(c.index)}>
                    <HintBadge type={c.clue.type} size={24} />
                    {t(`play.clue.${c.clue.type}` as MessageKey)}
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
              <button type="button" className="hint-btn" onClick={() => reveal(next)}>
                <span className="hint-bulb">
                  <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
                    <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <span className="hint-text">
                  <strong>{t('play.hint.more')}</strong>
                  <small>
                    {hintsLeft > 1 ? t('play.hint.left', { n: hintsLeft }) : t('play.hint.last')}
                    {costsPoint(next.clue.type) && ` · ${t('play.hint.costs')}`}
                  </small>
                </span>
                <HintBadge type={next.clue.type} size={34} />
              </button>
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
