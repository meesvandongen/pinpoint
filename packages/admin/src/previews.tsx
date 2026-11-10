import { pruneBlankOptionals, type PreviewProps } from 'gitvfs-cms/react'
import { Quest, Location, questLanguages, questProblems, ringArea, resolveText, CATEGORY_IDS, type Category } from 'pinpoint-core'

const category = (value: string): Category => ((CATEGORY_IDS as readonly string[]).includes(value) ? (value as Category) : 'other')

/** Checks of a quest as the game applies them, so authors see problems before a pull request does. */
/** The form leaves blank optional groups in the values; saving drops them, so the preview does too. */
const saved = (contentType: PreviewProps['contentType'], values: PreviewProps['values']) =>
  pruneBlankOptionals(contentType.schema as never, values)

export function QuestPreview({ contentType, values }: PreviewProps) {
  // The file name is the id, so the quest in the editor has none yet.
  const parsed = Quest.safeParse({ id: 'preview', ...(saved(contentType, values) as object) })
  if (!parsed.success) {
    return (
      <div className="pp-preview">
        <h2>Not ready yet</h2>
        <ul className="pp-issues">
          {parsed.error.issues.slice(0, 12).map((issue, i) => (
            <li key={i}>
              <code>{issue.path.join('.') || '(quest)'}</code> {issue.message}
            </li>
          ))}
        </ul>
      </div>
    )
  }
  const quest = parsed.data
  const problems = questProblems(quest)
  const languages = questLanguages(quest)
  const title = resolveText(quest.title, [quest.defaultLanguage], quest.defaultLanguage)
  return (
    <div className="pp-preview">
      <h2>{title}</h2>
      <p className="gcms-muted">
        {quest.pins.length} pin{quest.pins.length === 1 ? '' : 's'} · {quest.order === 'linear' ? 'in order' : 'any order'} ·{' '}
        {languages.length > 1 ? `languages: ${languages.join(', ')}` : `language: ${languages[0]}`}
      </p>
      {problems.length === 0 ? (
        <p className="pp-ok">Nothing to fix: the game would accept this quest.</p>
      ) : (
        <>
          <h3>To fix before it can be published</h3>
          <ul className="pp-issues">
            {problems.map((problem, i) => (
              <li key={i}>{problem}</li>
            ))}
          </ul>
        </>
      )}
      <ol className="pp-pins">
        {quest.pins.map((pin) => (
          <li key={pin.id}>
            <strong>{resolveText(pin.title, [quest.defaultLanguage], quest.defaultLanguage)}</strong>
            <span className="gcms-muted">
              {category(pin.category)} · {pin.clues.length} clue{pin.clues.length === 1 ? '' : 's'} · {pin.position.lat.toFixed(4)}, {pin.position.lng.toFixed(4)}
              {(() => {
                const facts = pin.arrival.filter((s) => s.type === 'fact').length
                const quizzes = pin.arrival.filter((s) => s.type === 'quiz').length
                return `${facts ? ` · ${facts} fact${facts === 1 ? '' : 's'}` : ''}${quizzes ? ` · ${quizzes} question${quizzes === 1 ? '' : 's'}` : ''}`
              })()}
            </span>
          </li>
        ))}
      </ol>
    </div>
  )
}

export function LocationPreview({ contentType, values }: PreviewProps) {
  const parsed = Location.safeParse({ id: 'preview', ...(saved(contentType, values) as object) })
  if (!parsed.success) return <div className="pp-preview"><h2>Not ready yet</h2><p className="gcms-muted">Draw at least three corners and give it a name.</p></div>
  const { name, polygon } = parsed.data
  const km2 = ringArea(polygon) / 1_000_000
  return (
    <div className="pp-preview">
      <h2>{resolveText(name, ['en'], 'en')}</h2>
      <p className="gcms-muted">
        {polygon.length} corners · about {km2 < 10 ? km2.toFixed(1) : Math.round(km2)} km². Players inside it are offered this place, smallest area first.
      </p>
    </div>
  )
}
