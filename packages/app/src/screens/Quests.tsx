import { questsInLocation, resolveText, type Content, type Location, type Quest, type Stamp } from 'pinpoint-core'
import { Pager } from '../components/Pager.tsx'

export function Quests({
  content,
  location,
  stamps,
  languages,
  expert,
  onExpert,
  onPick,
  onBack,
}: {
  content: Content
  location: Location
  stamps: Stamp[]
  languages: readonly string[]
  expert: boolean
  onExpert(on: boolean): void
  onPick(quest: Quest): void
  onBack(): void
}) {
  const quests = questsInLocation(location, content.quests)
  return (
    <section className="screen">
      <header className="cover">
        <button type="button" className="back" onClick={onBack}>
          ‹ Places
        </button>
        <h1>{resolveText(location.name, languages)}</h1>
        <p>{quests.length === 1 ? '1 quest' : `${quests.length} quests`}</p>
      </header>
      <div className="body">
        {quests.length === 0 ? (
          <div className="card">
            <h2>No quests yet</h2>
            <p>Anyone can add one. Quests are plain files in the Pinpoint repository.</p>
          </div>
        ) : (
          <Pager
            items={quests}
            perPage={3}
            label="quests"
            render={(q) => {
              const done = q.pins.filter((p) => stamps.some((s) => s.questId === q.id && s.pinId === p.id)).length
              return (
                <button type="button" key={q.id} className="quest" onClick={() => onPick(q)}>
                  <strong>{resolveText(q.title, languages, q.defaultLanguage)}</strong>
                  <span>
                    {done} of {q.pins.length} stamps · {q.order === 'linear' ? 'in order' : 'any order'}
                  </span>
                  {q.description && <small>{resolveText(q.description, languages, q.defaultLanguage)}</small>}
                </button>
              )
            }}
          />
        )}
      </div>
      <footer className="foot">
        <label className="toggle">
          <input type="checkbox" checked={expert} onChange={(e) => onExpert(e.target.checked)} />
          <span>Local expert: hide distance, direction and map</span>
        </label>
      </footer>
    </section>
  )
}
