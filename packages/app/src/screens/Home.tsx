import { locationsContaining, resolveText, ringArea, type Content, type Location } from 'pinpoint-core'
import { Pager } from '../components/Pager.tsx'
import type { FixState } from '../lib/useFix.ts'

export function Home({
  content,
  fixState,
  languages,
  onPick,
}: {
  content: Content
  fixState: FixState
  languages: readonly string[]
  onPick(location: Location): void
}) {
  const near = fixState.fix ? locationsContaining(fixState.fix, content.locations) : []
  const nearIds = new Set(near.map((l) => l.id))
  const others = content.locations
    .filter((l) => !nearIds.has(l.id))
    .sort((a, b) => ringArea(a.polygon) - ringArea(b.polygon))
  const list = [...near, ...others]
  return (
    <section className="screen">
      <header className="cover">
        <h1>Pinpoint</h1>
        <p>Find real places. Collect stamps.</p>
      </header>
      <div className="body">
        {!fixState.active ? (
          <div className="card">
            <h2>Where are you?</h2>
            <p>Share your location and Pinpoint suggests where to play. It stays on your phone.</p>
            <button type="button" className="btn primary" onClick={fixState.start}>
              Use my location
            </button>
          </div>
        ) : (
          <p className="status">
            {fixState.fix
              ? near.length
                ? 'You are in:'
                : 'No quests here yet. Pick another place:'
              : fixState.error ?? 'Looking for you…'}
          </p>
        )}
        <h2 className="sub">{fixState.active && near.length ? 'Places' : 'Or choose a place'}</h2>
        <Pager
          items={list}
          perPage={4}
          label="places"
          render={(l) => (
            <button type="button" key={l.id} className="row" onClick={() => onPick(l)}>
              <span>{resolveText(l.name, languages)}</span>
              {nearIds.has(l.id) && <em>near you</em>}
            </button>
          )}
        />
      </div>
    </section>
  )
}
