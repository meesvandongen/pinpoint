import { useEffect, useMemo, useState } from 'react'
import { getPhoto, listPhotos, usePhotosVersion } from './db.ts'
import { pendingPhotos, usePendingPhoto, usePendingPhotos } from './save.ts'

/** An object URL for the photo of a pin, or `undefined` while loading or when there is none. */
export function usePhotoUrl(questId: string, pinId: string): string | undefined {
  const pending = usePendingPhoto(questId, pinId)
  const stored = useStoredPhotoUrl(questId, pinId)
  return pending ?? stored
}

function useStoredPhotoUrl(questId: string, pinId: string): string | undefined {
  const version = usePhotosVersion()
  const [url, setUrl] = useState<string>()
  useEffect(() => {
    let revoked: string | undefined
    let cancelled = false
    getPhoto(questId, pinId)
      .then((photo) => {
        if (cancelled) return
        revoked = photo ? URL.createObjectURL(photo.blob) : undefined
        setUrl(revoked)
      })
      .catch(() => setUrl(undefined))
    return () => {
      cancelled = true
      if (revoked) URL.revokeObjectURL(revoked)
    }
  }, [questId, pinId, version])
  return url
}

/** Object URLs for every photo of a quest, keyed by pin id. */
export function usePhotoUrls(questId: string): Record<string, string> {
  const all = usePendingPhotos()
  const stored = useStoredPhotoUrls(questId)
  return useMemo(() => ({ ...stored, ...pendingPhotos(all, questId) }), [stored, all, questId])
}

function useStoredPhotoUrls(questId: string): Record<string, string> {
  const version = usePhotosVersion()
  const [urls, setUrls] = useState<Record<string, string>>({})
  useEffect(() => {
    let cancelled = false
    const created: string[] = []
    listPhotos(questId)
      .then((photos) => {
        if (cancelled) return
        const next: Record<string, string> = {}
        for (const photo of photos) {
          const url = URL.createObjectURL(photo.blob)
          created.push(url)
          next[photo.pinId] = url
        }
        setUrls(next)
      })
      .catch(() => setUrls({}))
    return () => {
      cancelled = true
      created.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [questId, version])
  return urls
}

/** The stored photos of a quest, or `undefined` until they are loaded. */
export function usePhotoRecords(questId: string) {
  const version = usePhotosVersion()
  const [records, setRecords] = useState<Awaited<ReturnType<typeof listPhotos>>>()
  useEffect(() => {
    let cancelled = false
    listPhotos(questId)
      .then((r) => !cancelled && setRecords(r))
      .catch(() => !cancelled && setRecords([]))
    return () => {
      cancelled = true
    }
  }, [questId, version])
  return records
}
