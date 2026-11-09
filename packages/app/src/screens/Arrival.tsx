import { useRef, useState } from 'react'
import { Navigate, useCanGoBack, useLocation, useNavigate, useParams, useRouter } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { arrivalPages, extrasOf, resolveText, type ArrivalPage, type Fact, type PhotoStep, type Pin, type Quest, type Quiz, type Stamp as StampRecord } from 'pinpoint-core'
import { Body, Cover, Foot, Screen } from '../components/layout.tsx'
import { Dots, PageTurn } from '../components/PageTurn.tsx'
import { contentQuery } from '../content.ts'
import { useI18n } from '../i18n/index.ts'
import { savePhoto } from '../photos/save.ts'
import { usePhotoUrl } from '../photos/usePhoto.ts'
import { land } from '../state/landing.ts'
import { findStamp, patchStamp, useStamps } from '../state/progress.ts'
import { ExtraMark } from '../stamps/Stamp.tsx'
import { NotFound } from './NotFound.tsx'

export function Arrival() {
  const { questId, pinId } = useParams({ from: '/app/quest/$questId/arrived/$pinId' })
  const { data: content } = useSuspenseQuery(contentQuery)
  const stamps = useStamps()
  const quest = content.quests.find((q) => q.id === questId)
  const pin = quest?.pins.find((p) => p.id === pinId)
  const stamp = findStamp(stamps, questId, pinId)
  if (!quest || !pin) return <NotFound />
  if (!stamp) return <Navigate to="/quest/$questId" params={{ questId }} replace />
  return <ArrivalPages quest={quest} pin={pin} stamp={stamp} />
}

function ArrivalPages({ quest, pin, stamp }: { quest: Quest; pin: Pin; stamp: StampRecord }) {
  const { t, contentLanguages } = useI18n()
  const navigate = useNavigate()
  const router = useRouter()
  const canGoBack = useCanGoBack()
  const fromPin = useLocation({ select: (l) => (l.state as { fromPin?: boolean }).fromPin === true })
  const [index, setIndex] = useState(0)
  const steps: ArrivalPage[] = arrivalPages(pin)
  const step = steps[index]
  const tr = (text: Parameters<typeof resolveText>[0]) => resolveText(text, contentLanguages, quest.defaultLanguage)
  const extras = extrasOf(stamp)
  const last = index === steps.length - 1
  const photoPending = step.kind === 'photo' && !stamp.photo
  const quizPending = step.kind === 'quiz' && stamp.quiz?.[step.index] === undefined

  const next = () => {
    if (last) {
      // Back to the quest page, where the stamp is pressed onto the pin's page. By going back in history when this
      // page came from the pin, so the history does not fill up with copies of the quest page.
      land(quest.id, pin.id)
      if (fromPin && canGoBack) router.history.back()
      else void navigate({ to: '/quest/$questId', params: { questId: quest.id }, replace: true })
    } else setIndex(index + 1)
  }

  return (
    <Screen className="arrival">
      <Cover title={tr(pin.title)} subtitle={t('arrival.title')}>
        {extras.length > 0 && (
          <div className="extras-row" aria-label={t('arrival.extras')}>
            {extras.map((extra) => (
              <ExtraMark key={extra} extra={extra} label={t(`extra.${extra}`)} seed={`${quest.id}/${pin.id}`} />
            ))}
          </div>
        )}
      </Cover>
      <Body>
        <PageTurn index={index} total={steps.length}>
          {step.kind === 'photo' && <PhotoPage quest={quest} pin={pin} stamp={stamp} step={step.step} />}
          {step.kind === 'fact' && <FactPage quest={quest} fact={step.step} />}
          {step.kind === 'quiz' && <QuizPage key={step.index} quest={quest} pin={pin} stamp={stamp} quiz={step.step} index={step.index} />}
        </PageTurn>
      </Body>
      <Foot>
        <Dots index={index} total={steps.length} />
        <button type="button" className="btn primary" onClick={next}>
          {quizPending ? t('arrival.quiz.skip') : last ? t('common.continue') : photoPending ? t('arrival.photo.skip') : t('common.next')}
        </button>
      </Foot>
    </Screen>
  )
}

function FactPage({ quest, fact }: { quest: Quest; fact: Fact }) {
  const { t, contentLanguages } = useI18n()
  return (
    <div className="page fact-page">
      <h2>{t('arrival.fact.title')}</h2>
      <p className="fact">{resolveText(fact.text, contentLanguages, quest.defaultLanguage)}</p>
    </div>
  )
}

function PhotoPage({ quest, pin, stamp, step }: { quest: Quest; pin: Pin; stamp: StampRecord; step?: PhotoStep }) {
  const { t, contentLanguages } = useI18n()
  const url = usePhotoUrl(quest.id, pin.id)
  const input = useRef<HTMLInputElement>(null)
  const [failed, setFailed] = useState(false)
  const prompt = step?.prompt ? resolveText(step.prompt, contentLanguages, quest.defaultLanguage) : t('arrival.photo.default')

  // The photo shows at once and is shrunk and stored behind the scenes, so the player can go on straight away.
  const onFile = (file: File | undefined) => {
    if (!file) return
    const had = stamp.photo === true
    setFailed(false)
    patchStamp(quest.id, pin.id, { photo: true })
    savePhoto(quest.id, pin.id, file).catch(() => {
      patchStamp(quest.id, pin.id, { photo: had })
      setFailed(true)
    })
  }

  return (
    <div className="page photo-page">
      <p className="prompt">{prompt}</p>
      <div className="polaroid">
        <div className="polaroid-photo">{url && stamp.photo ? <img src={url} alt="" data-testid="photo-preview" /> : <span>{t('arrival.photo.empty')}</span>}</div>
      </div>
      <input
        ref={input}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        data-testid="photo-input"
        onChange={(e) => {
          onFile(e.target.files?.[0])
          e.target.value = ''
        }}
      />
      <button type="button" className="btn" onClick={() => input.current?.click()}>
        {stamp.photo ? t('arrival.photo.again') : t('arrival.photo.take')}
      </button>
      {stamp.photo && !failed && <p className="status" role="status">{t('arrival.photo.saved')}</p>}
      {failed && <p className="status warn" role="alert">{t('arrival.photo.failed')}</p>}
    </div>
  )
}

function QuizPage({ quest, pin, stamp, quiz, index }: { quest: Quest; pin: Pin; stamp: StampRecord; quiz: Quiz; index: number }) {
  const { t, contentLanguages } = useI18n()
  const [picked, setPicked] = useState<number>()
  const result = stamp.quiz?.[index]
  const answered = result !== undefined
  const tr = (text: Parameters<typeof resolveText>[0]) => resolveText(text, contentLanguages, quest.defaultLanguage)
  return (
    <div className="page quiz-page">
      <h2>{t('arrival.quiz.title')}</h2>
      <p className="question">{tr(quiz.question)}</p>
      <div className="options">
        {quiz.options.map((option, i) => {
          const state = !answered ? '' : i === quiz.answer ? 'right' : i === picked ? 'wrong' : ''
          return (
            <button
              key={i}
              type="button"
              className={`btn ${state}`}
              disabled={answered}
              onClick={() => {
                setPicked(i)
                patchStamp(quest.id, pin.id, { quiz: { ...stamp.quiz, [index]: i === quiz.answer ? 'correct' : 'wrong' } })
              }}
            >
              {tr(option)}
            </button>
          )
        })}
      </div>
      {answered && (
        <p className={`status ${result === 'correct' ? 'good' : ''}`} role="status">
          {result === 'correct' ? t('arrival.quiz.right') : t('arrival.quiz.wrong')}
        </p>
      )}
    </div>
  )
}
