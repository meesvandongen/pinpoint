import { useField, type FieldProps } from 'gitvfs-cms/react'
import { LIMITS } from 'pinpoint-core'
import { LocalizedInput, type LocalizedValue } from './LocalizedInput.tsx'

type Quiz = { question?: LocalizedValue; options?: LocalizedValue[]; answer?: number }

const isQuiz = (value: unknown): value is Quiz =>
  typeof value === 'object' && value !== null && Array.isArray((value as Quiz).options)

/**
 * The optional question of a pin. A plain nested form cannot leave this group blank (a blank list
 * counts as a value), so the field owns it: no question is `undefined`, a question is complete.
 */
export function QuizField({ id }: FieldProps) {
  const field = useField(id)
  const quiz = isQuiz(field.value) ? field.value : undefined
  const set = (next: Quiz | undefined) => field.onChange(next)

  if (!quiz) {
    return (
      <button type="button" className="gcms-button" onClick={() => set({ question: '', options: ['', ''], answer: 0 })}>
        Add a question
      </button>
    )
  }

  const options = quiz.options ?? []
  const answer = typeof quiz.answer === 'number' ? quiz.answer : 0
  const setOption = (index: number, value: string | Record<string, string> | undefined) =>
    set({ ...quiz, options: options.map((o, i) => (i === index ? (value as LocalizedValue) : o)) })

  return (
    <div className="pp-quiz">
      <LocalizedInput label="Question" value={quiz.question} max={LIMITS.question} onChange={(question) => set({ ...quiz, question })} />
      <p className="gcms-description">Two to four answers. Mark the right one.</p>
      {options.map((option, index) => (
        <div className="pp-quiz-option" key={index}>
          <input
            type="radio"
            name={`${id}-answer`}
            checked={answer === index}
            aria-label={`Answer ${index + 1} is the right one`}
            onChange={() => set({ ...quiz, answer: index })}
          />
          <div className="pp-quiz-text">
            <LocalizedInput label={`Answer ${index + 1}`} value={option} max={LIMITS.option} onChange={(value) => setOption(index, value)} />
          </div>
          <button
            type="button"
            className="gcms-button gcms-button--small"
            disabled={options.length <= 2}
            aria-label={`Remove answer ${index + 1}`}
            onClick={() =>
              set({ ...quiz, options: options.filter((_, i) => i !== index), answer: answer === index ? 0 : answer > index ? answer - 1 : answer })
            }
          >
            ×
          </button>
        </div>
      ))}
      <div className="pp-row">
        <button type="button" className="gcms-button gcms-button--small" disabled={options.length >= 4} onClick={() => set({ ...quiz, options: [...options, ''] })}>
          Add an answer
        </button>
        <button type="button" className="gcms-button gcms-button--small" onClick={() => set(undefined)}>
          Remove the question
        </button>
      </div>
    </div>
  )
}
