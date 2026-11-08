import { useField, type FieldProps } from 'gitvfs-cms/react'
import { KNOWN_CLUE_TYPES, LIMITS, type Clue, type KnownClueType } from 'pinpoint-core'
import { LocalizedInput } from './LocalizedInput.tsx'

const LABELS: Record<KnownClueType, string> = {
  text: 'Text or riddle',
  distance: 'Distance',
  direction: 'Direction',
  map: 'Map',
  photo: 'Photo',
  audio: 'Sound',
  wordShape: 'Word shape',
}

const HELP: Record<KnownClueType, string> = {
  text: 'A hint, a riddle or a description. Keep it short: it has to fit on one screen.',
  distance: 'How far the player is from the pin.',
  direction: 'An arrow or a compass point towards the pin.',
  map: 'A map: the exact pin, or only a rough area around it.',
  photo: 'A picture of the place. Put the file under content/ and give its path, not a web address.',
  audio: 'A sound or a spoken hint. Put the file under content/ and give its path, not a web address.',
  wordShape: 'The shape of a word to find: its length, and the first letter of each word.',
}

const NEW_CLUE: Record<KnownClueType, Record<string, unknown>> = {
  text: { type: 'text', text: '' },
  distance: { type: 'distance' },
  direction: { type: 'direction', mode: 'arrow' },
  map: { type: 'map', view: 'full' },
  photo: { type: 'photo', src: '' },
  audio: { type: 'audio', src: '' },
  wordShape: { type: 'wordShape', word: '', showFirstLetter: true },
}

type Loose = Record<string, unknown> & { type: string; reveal?: { afterSeconds?: number; onRequest?: boolean } }

const isKnown = (type: string): type is KnownClueType => (KNOWN_CLUE_TYPES as readonly string[]).includes(type)

/** When the clue shows up: from the start, after some seconds, or only when the player asks. */
function revealMode(clue: Loose): 'start' | 'time' | 'request' {
  if (clue.reveal?.onRequest) return 'request'
  if (clue.reveal?.afterSeconds) return 'time'
  return 'start'
}

/**
 * The list of clues of a pin. `field({ fieldType: 'clues' })` on a `z.array(Clue)`; the value stays
 * the same list of plain objects the content files hold.
 */
export function CluesField({ id }: FieldProps) {
  const field = useField(id)
  const clues = (Array.isArray(field.value) ? field.value : []) as Loose[]
  const set = (next: Loose[]) => field.onChange(next)
  const update = (index: number, patch: Record<string, unknown>) =>
    set(clues.map((clue, i) => (i === index ? ({ ...clue, ...patch } as Loose) : clue)))
  const move = (index: number, by: -1 | 1) => {
    const next = [...clues]
    const [item] = next.splice(index, 1)
    next.splice(index + by, 0, item)
    set(next)
  }

  return (
    <div className="pp-clues">
      {clues.length === 0 && <p className="gcms-muted">A pin needs at least one clue.</p>}
      {clues.map((clue, index) => {
        const known = isKnown(clue.type)
        const mode = revealMode(clue)
        return (
          <fieldset className="pp-clue" key={index}>
            <legend>
              {known ? LABELS[clue.type as KnownClueType] : `Unknown clue type "${clue.type}"`}
            </legend>
            <div className="pp-clue-tools">
              <button type="button" className="gcms-button gcms-button--small" disabled={index === 0} onClick={() => move(index, -1)} aria-label="Move up">↑</button>
              <button type="button" className="gcms-button gcms-button--small" disabled={index === clues.length - 1} onClick={() => move(index, 1)} aria-label="Move down">↓</button>
              <button type="button" className="gcms-button gcms-button--small" onClick={() => set(clues.filter((_, i) => i !== index))} aria-label="Remove clue">×</button>
            </div>

            {known ? <p className="gcms-description">{HELP[clue.type as KnownClueType]}</p> : <p className="gcms-description">A newer version of the game uses this clue. It is kept as it is.</p>}

            {clue.type === 'direction' && (
              <label className="pp-field">
                Shown as
                <select className="gcms-input" value={(clue.mode as string | undefined) ?? 'arrow'} onChange={(e) => update(index, { mode: e.target.value })}>
                  <option value="arrow">An arrow that turns with the phone</option>
                  <option value="cardinal">A compass point (N, NE, …)</option>
                </select>
              </label>
            )}
            {clue.type === 'map' && (
              <label className="pp-field">
                Shows
                <select className="gcms-input" value={(clue.view as string | undefined) ?? 'full'} onChange={(e) => update(index, { view: e.target.value })}>
                  <option value="full">The pin and its arrival circle</option>
                  <option value="area">Only a rough area around it</option>
                </select>
              </label>
            )}
            {clue.type === 'text' && (
              <LocalizedInput label="Text" value={clue.text as never} max={LIMITS.hint} multiline onChange={(text) => update(index, { text })} />
            )}
            {(clue.type === 'photo' || clue.type === 'audio') && (
              <>
                <label className="pp-field">
                  File
                  <input className="gcms-input" placeholder="media/chimney.jpg" value={(clue.src as string | undefined) ?? ''} onChange={(e) => update(index, { src: e.target.value })} />
                </label>
                <LocalizedInput
                  label={clue.type === 'photo' ? 'Description for screen readers' : 'Caption'}
                  value={(clue.type === 'photo' ? clue.alt : clue.caption) as never}
                  max={LIMITS.caption}
                  onChange={(text) => update(index, clue.type === 'photo' ? { alt: text } : { caption: text })}
                />
              </>
            )}
            {clue.type === 'wordShape' && (
              <>
                <LocalizedInput label="The word" value={clue.word as never} max={LIMITS.word} onChange={(word) => update(index, { word })} />
                <label className="pp-check">
                  <input type="checkbox" checked={clue.showFirstLetter !== false} onChange={(e) => update(index, { showFirstLetter: e.target.checked })} />
                  Show the first letter of each word
                </label>
              </>
            )}
            {!known && <pre className="pp-json">{JSON.stringify(clue, null, 2)}</pre>}

            <div className="pp-reveal">
              <label className="pp-field">
                Appears
                <select
                  className="gcms-input"
                  value={mode}
                  onChange={(e) => {
                    const { reveal: _, ...rest } = clue
                    const next = e.target.value
                    set(clues.map((c, i) => (i !== index ? c : next === 'time' ? ({ ...rest, reveal: { afterSeconds: 60 } } as Loose) : next === 'request' ? ({ ...rest, reveal: { onRequest: true } } as Loose) : (rest as Loose))))
                  }}
                >
                  <option value="start">From the start</option>
                  <option value="time">After a while</option>
                  <option value="request">Only when the player asks</option>
                </select>
              </label>
              {mode === 'time' && (
                <label className="pp-field">
                  Seconds
                  <input
                    className="gcms-input"
                    type="number"
                    min={5}
                    step={5}
                    value={clue.reveal?.afterSeconds ?? 60}
                    onChange={(e) => update(index, { reveal: { afterSeconds: Math.max(1, Math.round(Number(e.target.value) || 60)) } })}
                  />
                </label>
              )}
            </div>
          </fieldset>
        )
      })}
      <label className="pp-field pp-add-clue">
        <span className="gcms-muted">Add a clue</span>
        <select
          className="gcms-input"
          value=""
          aria-label="Add a clue"
          onChange={(e) => e.target.value && set([...clues, NEW_CLUE[e.target.value as KnownClueType] as Loose])}
        >
          <option value="">Choose a type…</option>
          {KNOWN_CLUE_TYPES.map((type) => (
            <option key={type} value={type}>
              {LABELS[type]}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}

export type { Clue }
