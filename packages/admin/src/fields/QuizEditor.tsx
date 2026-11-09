import { LIMITS } from 'pinpoint-core'
import { LocalizedInput, type LocalizedValue } from './LocalizedInput.tsx'

export type QuizValue = { type: 'quiz'; question?: LocalizedValue; options?: LocalizedValue[]; answer?: number }

export const NEW_QUIZ: QuizValue = { type: 'quiz', question: '', options: ['', ''], answer: 0 }

/** One question: the question, two to four answers, and which one is right. */
export function QuizEditor({ id, quiz, onChange }: { id: string; quiz: QuizValue; onChange: (next: QuizValue) => void }) {
  const options = quiz.options ?? []
  const answer = typeof quiz.answer === 'number' ? quiz.answer : 0
  const set = onChange
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
      </div>
    </div>
  )
}
