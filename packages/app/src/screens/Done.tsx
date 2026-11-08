import { useEffect, useState } from 'react'
import { Link, useParams } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { resolveText } from 'pinpoint-core'
import { renderCollage } from '../collage/render.ts'
import { Body, Cover, Foot, Screen } from '../components/layout.tsx'
import { contentQuery } from '../content.ts'
import { useI18n } from '../i18n/index.ts'
import { usePhotoRecords } from '../photos/usePhoto.ts'
import { useStamps } from '../state/progress.ts'
import { questStampPropsFor, stampPropsFor } from '../stamps/for-pin.ts'
import { stampSvg } from '../stamps/svg.ts'
import { QuestStamp } from '../stamps/Stamp.tsx'
import { NotFound } from './NotFound.tsx'

export function Done() {
  const { questId } = useParams({ from: '/app/quest/$questId/done' })
  const { data: content } = useSuspenseQuery(contentQuery)
  const i18n = useI18n()
  const { t, contentLanguages } = i18n
  const stamps = useStamps()
  const photos = usePhotoRecords(questId)
  const quest = content.quests.find((q) => q.id === questId)
  const mine = stamps.filter((s) => s.questId === questId)
  const [collage, setCollage] = useState<{ url: string; blob: Blob }>()
  const [failed, setFailed] = useState(false)

  const photoCount = photos?.length ?? 0
  const language = i18n.language

  useEffect(() => {
    if (!quest || !photos || photos.length === 0) return
    let cancelled = false
    let created: string | undefined
    const tr = (text: Parameters<typeof resolveText>[0]) => resolveText(text, contentLanguages, quest.defaultLanguage)
    const days = [...new Set(mine.map((s) => s.at).sort().map((at) => i18n.formatDate(at)))]
    renderCollage({
      title: tr(quest.title),
      subtitle: days.length > 1 ? `${days[0]} – ${days.at(-1)}` : (days[0] ?? ''),
      photos: photos.map((p) => ({ blob: p.blob, caption: tr(quest.pins.find((x) => x.id === p.pinId)?.title ?? p.pinId) })),
      stamps: quest.pins.flatMap((pin) => {
        const stamp = mine.find((s) => s.pinId === pin.id)
        return stamp ? [stampSvg(stampPropsFor(quest, pin, stamp, i18n))] : []
      }),
      seed: quest.id,
    })
      .then((blob) => {
        if (cancelled) return
        created = URL.createObjectURL(blob)
        setCollage({ url: created, blob })
        setFailed(false)
      })
      .catch(() => !cancelled && setFailed(true))
    return () => {
      cancelled = true
      if (created) URL.revokeObjectURL(created)
    }
    // The collage depends on which photos exist, the stamps, and the language.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quest?.id, photos, mine.length, language])

  if (!quest) return <NotFound />

  const share = async () => {
    if (!collage) return
    const file = new File([collage.blob], `${quest.id}-collage.png`, { type: 'image/png' })
    if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: resolveText(quest.title, contentLanguages, quest.defaultLanguage) }).catch(() => undefined)
  }
  const canShare = typeof navigator.canShare === 'function'

  return (
    <Screen className="done">
      <Cover title={resolveText(quest.title, contentLanguages, quest.defaultLanguage)} subtitle={t('done.title')} />
      <Body className="done-body">
        <QuestStamp className="quest-stamp" stamp={questStampPropsFor(quest, stamps, i18n)} />
        <div className="collage-slot">
          {photoCount === 0 && photos && <p className="status">{t('done.noPhotos')}</p>}
          {photoCount > 0 && !collage && !failed && <p className="status" role="status">{t('done.working')}</p>}
          {failed && <p className="status warn" role="alert">{t('done.failed')}</p>}
          {collage && <img className="collage-preview" src={collage.url} alt="" data-testid="collage" />}
        </div>
      </Body>
      <Foot>
        {collage && (
          <div className="foot-nav">
            <a className="btn primary" href={collage.url} download={`${quest.id}-collage.png`}>
              {t('done.save')}
            </a>
            {canShare && (
              <button type="button" className="btn" onClick={() => void share()}>
                {t('done.share')}
              </button>
            )}
          </div>
        )}
        <div className="foot-nav">
          <Link to="/book/$questId" params={{ questId: quest.id }} className="btn">
            {t('done.stamps')}
          </Link>
          <Link to="/" className="btn">
            {t('done.back')}
          </Link>
        </div>
      </Foot>
    </Screen>
  )
}
