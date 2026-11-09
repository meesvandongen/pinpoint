import { useField, type FieldProps } from 'gitvfs-cms/react'
import { KNOWN_ARRIVAL_TYPES, LIMITS, type KnownArrivalType } from 'pinpoint-core'
import { LocalizedInput } from './LocalizedInput.tsx'
import { NEW_QUIZ, QuizEditor, type QuizValue } from './QuizEditor.tsx'

const LABELS: Record<KnownArrivalType, string> = {
  fact: 'Fact',
  quiz: 'Question',
  photo: 'Photo page',
}

const HELP: Record<KnownArrivalType, string> = {
  fact: 'Something to tell the player now that they are here.',
  quiz: 'A question about the place. A wrong answer can cost a star.',
  photo: 'Every pin has one photo page. Without this, it comes right after the stamp; with it, here, with your suggestion.',
}

const NEW_STEP: Record<KnownArrivalType, Record<string, unknown>> = {
  fact: { type: 'fact', text: '' },
  quiz: NEW_QUIZ,
  photo: { type: 'photo' },
}

type Loose = Record<string, unknown> & { type: string }

const isKnown = (type: string): type is KnownArrivalType => (KNOWN_ARRIVAL_TYPES as readonly string[]).includes(type)

/**
 * The pages a pin shows after check-in, in order. `field({ fieldType: 'arrival' })` on a
 * `z.array(ArrivalStep)`; the value stays the same list of plain objects the content files hold.
 */
export function ArrivalField({ id }: FieldProps) {
  const field = useField(id)
  const steps = (Array.isArray(field.value) ? field.value : []) as Loose[]
  const set = (next: Loose[]) => field.onChange(next)
  const replace = (index: number, next: Loose) => set(steps.map((step, i) => (i === index ? next : step)))
  const move = (index: number, by: -1 | 1) => {
    const next = [...steps]
    const [item] = next.splice(index, 1)
    next.splice(index + by, 0, item)
    set(next)
  }
  const hasPhoto = steps.some((step) => step.type === 'photo')

  return (
    <div className="pp-clues">
      {steps.length === 0 && <p className="gcms-muted">Only the stamp and the photo page. Add facts or questions to tell the player more.</p>}
      {steps.map((step, index) => {
        const known = isKnown(step.type)
        return (
          <fieldset className="pp-clue" key={index}>
            <legend>{known ? LABELS[step.type as KnownArrivalType] : `Unknown step type "${step.type}"`}</legend>
            <div className="pp-clue-tools">
              <button type="button" className="gcms-button gcms-button--small" disabled={index === 0} onClick={() => move(index, -1)} aria-label="Move up">↑</button>
              <button type="button" className="gcms-button gcms-button--small" disabled={index === steps.length - 1} onClick={() => move(index, 1)} aria-label="Move down">↓</button>
              <button type="button" className="gcms-button gcms-button--small" onClick={() => set(steps.filter((_, i) => i !== index))} aria-label="Remove step">×</button>
            </div>
            <p className="gcms-description">{known ? HELP[step.type as KnownArrivalType] : 'A newer version of the game uses this step. It is kept as it is.'}</p>
            {step.type === 'fact' && (
              <LocalizedInput label="Fact" value={step.text as never} max={LIMITS.fact} multiline onChange={(text) => replace(index, { ...step, text })} />
            )}
            {step.type === 'quiz' && <QuizEditor id={`${id}-${index}`} quiz={step as QuizValue} onChange={(next) => replace(index, next as Loose)} />}
            {step.type === 'photo' && (
              <LocalizedInput
                label="Photo suggestion"
                value={step.prompt as never}
                max={LIMITS.prompt}
                onChange={(prompt) => {
                  const { prompt: _, ...rest } = step
                  replace(index, (prompt === undefined ? rest : { ...rest, prompt }) as Loose)
                }}
              />
            )}
            {!known && <pre className="pp-json">{JSON.stringify(step, null, 2)}</pre>}
          </fieldset>
        )
      })}
      <label className="pp-field pp-add-clue">
        <span className="gcms-muted">Add a page</span>
        <select className="gcms-input" value="" aria-label="Add a page" onChange={(e) => e.target.value && set([...steps, NEW_STEP[e.target.value as KnownArrivalType] as Loose])}>
          <option value="">Choose a type…</option>
          {KNOWN_ARRIVAL_TYPES.map((type) => (
            <option key={type} value={type} disabled={type === 'photo' && hasPhoto}>
              {LABELS[type]}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}
