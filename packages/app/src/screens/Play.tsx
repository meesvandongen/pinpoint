import { useEffect, useMemo, useState } from 'react'
import {
  arrowRotation,
  bearingDegrees,
  cardinal,
  formatDistance,
  playablePins,
  proximity,
  resolveClues,
  resolveText,
  type KnownClue,
  type Pin,
  type Quest,
  type Stamp as StampRecord,
} from 'pinpoint-core'
import { AreaMap } from '../components/AreaMap.tsx'
import { Stamp } from '../components/Stamp.tsx'
import type { FixState } from '../lib/useFix.ts'

type Props = {
  quest: Quest
  stamps: StampRecord[]
  fixState: FixState
  heading?: number
  onAskHeading(): void
  languages: readonly string[]
  expert: boolean
  onStamp(stamp: StampRecord): void
  onQuiz(pinId: string, result: 'correct' | 'wrong'): void
  onExit(): void
}

export function Play(props: Props) {
  const { quest, stamps } = props
  const stamped = useMemo(
    () => new Set(stamps.filter((s) => s.questId === quest.id).map((s) => s.pinId)),
    [stamps, quest.id],
  )
  const open = playablePins(quest, stamped)
  const [chosen, setChosen] = useState<string>()
  const pin = open.find((p) => p.id === chosen) ?? open[0]
  const [arrived, setArrived] = useState<StampRecord>()

  if (arrived) {
    const done = quest.pins.find((p) => p.id === arrived.pinId)!
    return <Arrival {...props} pin={done} stamp={arrived} onContinue={() => setArrived(undefined)} />
  }
  if (!pin) return <Finished {...props} />
  return <PinScreen key={pin.id} {...props} pin={pin} open={open} stamped={stamped} onChoose={setChosen} onArrive={setArrived} />
}

function t(quest: Quest, languages: readonly string[], text: Parameters<typeof resolveText>[0]) {
  return resolveText(text, languages, quest.defaultLanguage)
}

function PinScreen({
  quest,
  pin,
  open,
  stamped,
  fixState,
  heading,
  onAskHeading,
  languages,
  expert,
  onStamp,
  onChoose,
  onArrive,
  onExit,
}: Props & { pin: Pin; open: Pin[]; stamped: Set<string>; onChoose(id: string): void; onArrive(s: StampRecord): void }) {
  const [elapsed, setElapsed] = useState(0)
  const [requested, setRequested] = useState<ReadonlySet<number>>(new Set())
  const [deckIndex, setDeckIndex] = useState(0)
  useEffect(() => {
    const started = Date.now()
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 1000)
    return () => clearInterval(id)
  }, [])

  const { fix } = fixState
  const states = resolveClues(pin, { elapsedSeconds: elapsed, requested, expert })
  const visible = states.filter((s) => s.visible).map((s) => s.clue as KnownClue)
  const prox = fix ? proximity(fix, pin) : undefined
  const bearing = fix ? bearingDegrees(fix, pin.position) : undefined
  const showDistance = visible.some((c) => c.type === 'distance')
  const dir = visible.find((c) => c.type === 'direction')
  const deck = states.filter((s) => s.clue.type !== 'distance' && s.clue.type !== 'direction')
  const card = deck[Math.min(deckIndex, Math.max(0, deck.length - 1))]
  const index = quest.pins.findIndex((p) => p.id === pin.id)

  const checkIn = () => {
    const used = new Set(visible.map((c) => c.type))
    const stamp: StampRecord = { questId: quest.id, pinId: pin.id, at: new Date().toISOString(), clues: [...used] }
    onStamp(stamp)
    onArrive(stamp)
  }

  let status = 'Waiting for your location…'
  if (prox) {
    status =
      prox.state === 'arrived'
        ? 'You are here.'
        : prox.state === 'near'
          ? 'Almost there. Hold still while GPS settles.'
          : showDistance
            ? `${formatDistance(prox.distance)} to go.`
            : 'Keep exploring.'
  }

  return (
    <section className="screen play">
      <header className="cover">
        <button type="button" className="back" onClick={onExit}>
          ‹ Quests
        </button>
        <h1>{t(quest, languages, quest.title)}</h1>
        <div className="pins" aria-label={`Pin ${index + 1} of ${quest.pins.length}`}>
          {quest.pins.map((p, i) => (
            <button
              key={p.id}
              type="button"
              className={stamped.has(p.id) ? 'done' : p.id === pin.id ? 'now' : ''}
              disabled={quest.order === 'linear' || stamped.has(p.id) || !open.some((o) => o.id === p.id)}
              onClick={() => onChoose(p.id)}
              aria-label={`Pin ${i + 1}`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </header>

      <div className="body">
        {!fixState.active ? (
          <div className="card">
            <h2>Share your location</h2>
            <p>Needed to measure how far the pin is.</p>
            <button type="button" className="btn primary" onClick={fixState.start}>
              Use my location
            </button>
          </div>
        ) : (
          <>
            {(showDistance || dir) && (
              <div className="compass">
                {showDistance && <div className="dist">{prox ? formatDistance(prox.distance) : '…'}</div>}
                {dir && bearing !== undefined && (
                  <div className="dir">
                    {(dir as Extract<KnownClue, { type: 'direction' }>).mode === 'cardinal' ? (
                      <span className="card-dir">{cardinal(bearing)}</span>
                    ) : (
                      <svg viewBox="-28 -28 56 56" width="64" height="64" aria-label={`Direction ${cardinal(bearing)}`}>
                        <circle r="25" fill="none" stroke="currentColor" strokeWidth="2" />
                        <g transform={`rotate(${arrowRotation(bearing, heading)})`}>
                          <path d="M0-18 L8 12 L0 7 L-8 12Z" fill="var(--needle)" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                        </g>
                      </svg>
                    )}
                    {heading === undefined && (dir as { mode?: string }).mode !== 'cardinal' && (
                      <button type="button" className="link" onClick={onAskHeading}>
                        {`Points ${cardinal(bearing)}. Use compass`}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {card && (
              <div className="deck">
                {card.visible ? <ClueCard state={card.clue as KnownClue} pin={pin} fix={fixState.fix} quest={quest} languages={languages} /> : (
                  <div className="locked">
                    {card.lockedBy === 'time' ? (
                      <p>Another clue opens in {Math.max(0, (card.clue.reveal?.afterSeconds ?? 0) - elapsed)} s.</p>
                    ) : (
                      <p>A clue is waiting for you.</p>
                    )}
                    <button type="button" className="btn" onClick={() => setRequested(new Set([...requested, card.index]))}>
                      Show it now
                    </button>
                  </div>
                )}
                {deck.length > 1 && (
                  <div className="deck-nav">
                    <button type="button" className="turn" disabled={deckIndex === 0} onClick={() => setDeckIndex(deckIndex - 1)} aria-label="Previous clue">‹</button>
                    <span className="pager-dots">{deck.map((d, i) => <i key={d.index} className={i === deckIndex ? 'on' : ''} />)}</span>
                    <button type="button" className="turn" disabled={deckIndex >= deck.length - 1} onClick={() => setDeckIndex(deckIndex + 1)} aria-label="Next clue">›</button>
                  </div>
                )}
              </div>
            )}
            {fixState.error && <p className="status warn">{fixState.error}</p>}
          </>
        )}
      </div>

      <footer className="foot">
        <p className="status">{status}</p>
        <button type="button" className="btn primary" disabled={prox?.state !== 'arrived'} onClick={checkIn}>
          Check in
        </button>
        <Debug pin={pin} fixState={fixState} />
      </footer>
    </section>
  )
}

function ClueCard({ state, pin, fix, quest, languages }: { state: KnownClue; pin: Pin; fix?: FixState['fix']; quest: Quest; languages: readonly string[] }) {
  if (state.type === 'text') return <p className="clue-text">“{t(quest, languages, state.text)}”</p>
  if (state.type === 'map') return <AreaMap pin={pin} fix={fix} view={state.view} />
  if (state.type === 'photo') {
    return <img className="clue-photo" src={state.src} alt={state.alt ? t(quest, languages, state.alt) : ''} />
  }
  return null
}

function Arrival({
  quest,
  pin,
  stamp,
  languages,
  onQuiz,
  onContinue,
}: Props & { pin: Pin; stamp: StampRecord; onContinue(): void }) {
  const [picked, setPicked] = useState<number>()
  const quiz = pin.quiz
  return (
    <section className="screen arrival">
      <header className="cover">
        <h1>{t(quest, languages, pin.title)}</h1>
        <p>You arrived.</p>
      </header>
      <div className="body">
        <Stamp
          className="big-stamp"
          title={t(quest, languages, pin.title)}
          category={pin.category}
          ink={pin.stamp?.ink}
          at={stamp.at}
          clues={stamp.clues}
        />
        {quiz && (
          <div className="quiz">
            <p>{t(quest, languages, quiz.question)}</p>
            <div className="options">
              {quiz.options.map((o, i) => (
                <button
                  key={i}
                  type="button"
                  className={`btn ${picked === undefined ? '' : i === quiz.answer ? 'right' : i === picked ? 'wrong' : ''}`}
                  disabled={picked !== undefined}
                  onClick={() => {
                    setPicked(i)
                    onQuiz(pin.id, i === quiz.answer ? 'correct' : 'wrong')
                  }}
                >
                  {t(quest, languages, o)}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      <footer className="foot">
        <button type="button" className="btn primary" disabled={!!quiz && picked === undefined} onClick={onContinue}>
          Continue
        </button>
      </footer>
    </section>
  )
}

function Finished({ quest, stamps, languages, onExit }: Props) {
  const mine = stamps.filter((s) => s.questId === quest.id)
  return (
    <section className="screen">
      <header className="cover">
        <h1>{t(quest, languages, quest.title)}</h1>
        <p>Quest complete.</p>
      </header>
      <div className="body stampgrid">
        {quest.pins.map((p) => {
          const s = mine.find((x) => x.pinId === p.id)
          return s ? (
            <Stamp key={p.id} title={t(quest, languages, p.title)} category={p.category} ink={p.stamp?.ink} at={s.at} clues={s.clues} />
          ) : null
        })}
      </div>
      <footer className="foot">
        <button type="button" className="btn primary" onClick={onExit}>
          Back to quests
        </button>
      </footer>
    </section>
  )
}

/** Only with `?debug`: moves the simulated position so the game can be tried at a desk. */
function Debug({ pin, fixState }: { pin: Pin; fixState: FixState }) {
  if (!new URLSearchParams(location.search).has('debug')) return null
  const at = (dLat: number, accuracy = 10) => fixState.simulate({ lat: pin.position.lat + dLat, lng: pin.position.lng, accuracy })
  return (
    <div className="debug">
      <button type="button" onClick={() => at(0.0022)}>240 m N</button>
      <button type="button" onClick={() => at(0.0007)}>80 m N</button>
      <button type="button" onClick={() => at(0.0001, 120)}>vague fix</button>
      <button type="button" onClick={() => at(0)}>on the pin</button>
    </div>
  )
}
