import { useCallback, useEffect, useMemo, useState } from 'react'
import { loadContent, type Content, type Location, type Quest, type Stamp } from 'pinpoint-core'
import { loadExpert, loadStamps, saveExpert, saveStamps } from './lib/storage.ts'
import { useFix } from './lib/useFix.ts'
import { useHeading } from './lib/useHeading.ts'
import { Home } from './screens/Home.tsx'
import { Play } from './screens/Play.tsx'
import { Quests } from './screens/Quests.tsx'

/** Where game content is read from. Point `VITE_CONTENT_URL` at raw.githubusercontent.com to load straight from GitHub. */
const CONTENT_URL: string = import.meta.env.VITE_CONTENT_URL ?? '/content'

type View = { name: 'home' } | { name: 'quests'; location: Location } | { name: 'play'; location: Location; quest: Quest }

export function App() {
  const [content, setContent] = useState<Content>()
  const [error, setError] = useState<string>()
  const [view, setView] = useState<View>({ name: 'home' })
  const [stamps, setStamps] = useState<Stamp[]>(loadStamps)
  const [expert, setExpert] = useState(loadExpert)
  const fixState = useFix()
  const compass = useHeading()
  const languages = useMemo(() => (navigator.languages?.length ? navigator.languages : [navigator.language || 'en']), [])

  useEffect(() => {
    loadContent(CONTENT_URL, { onInvalid: (path, message) => console.warn(`Skipped ${path}: ${message}`) })
      .then(setContent)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
  }, [])

  useEffect(() => saveStamps(stamps), [stamps])

  const addStamp = useCallback(
    (stamp: Stamp) =>
      setStamps((all) =>
        all.some((s) => s.questId === stamp.questId && s.pinId === stamp.pinId) ? all : [...all, stamp],
      ),
    [],
  )
  const setQuiz = useCallback(
    (questId: string) => (pinId: string, result: 'correct' | 'wrong') =>
      setStamps((all) => all.map((s) => (s.questId === questId && s.pinId === pinId ? { ...s, quiz: result } : s))),
    [],
  )

  if (error) {
    return (
      <section className="screen">
        <header className="cover"><h1>Pinpoint</h1></header>
        <div className="body"><div className="card"><h2>Could not load quests</h2><p>{error}</p></div></div>
      </section>
    )
  }
  if (!content) {
    return (
      <section className="screen">
        <header className="cover"><h1>Pinpoint</h1><p>Loading quests…</p></header>
      </section>
    )
  }

  if (view.name === 'play') {
    const { location, quest } = view
    return (
      <Play
        quest={quest}
        stamps={stamps}
        fixState={fixState}
        heading={compass.heading}
        onAskHeading={compass.request}
        languages={languages}
        expert={expert}
        onStamp={addStamp}
        onQuiz={setQuiz(quest.id)}
        onExit={() => setView({ name: 'quests', location })}
      />
    )
  }
  if (view.name === 'quests') {
    const { location } = view
    return (
      <Quests
        content={content}
        location={location}
        stamps={stamps}
        languages={languages}
        expert={expert}
        onExpert={(on) => {
          setExpert(on)
          saveExpert(on)
        }}
        onPick={(quest) => setView({ name: 'play', location, quest })}
        onBack={() => setView({ name: 'home' })}
      />
    )
  }
  return <Home content={content} fixState={fixState} languages={languages} onPick={(location) => setView({ name: 'quests', location })} />
}
