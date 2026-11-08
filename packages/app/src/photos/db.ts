import { createStore, useStore } from '../lib/store.ts'

const DB_NAME = 'pinpoint'
const STORE = 'photos'

export type PhotoRecord = {
  /** `questId/pinId` */
  key: string
  questId: string
  pinId: string
  blob: Blob
  width: number
  height: number
  /** ISO timestamp the photo was taken. */
  at: string
}

let opening: Promise<IDBDatabase> | undefined

function open(): Promise<IDBDatabase> {
  opening ??= new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => {
      const store = request.result.createObjectStore(STORE, { keyPath: 'key' })
      store.createIndex('questId', 'questId')
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => {
      opening = undefined
      reject(request.error ?? new Error('Could not open the photo store'))
    }
  })
  return opening
}

function run<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return open().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const request = action(db.transaction(STORE, mode).objectStore(STORE))
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error ?? new Error('Photo store request failed'))
      }),
  )
}

/** Bumped after every change, so views showing photos reload them. */
const version = createStore(0)
const bump = () => version.set((n) => n + 1)
export const usePhotosVersion = () => useStore(version)

export const photoKey = (questId: string, pinId: string) => `${questId}/${pinId}`

export async function putPhoto(photo: Omit<PhotoRecord, 'key'>): Promise<void> {
  await run('readwrite', (s) => s.put({ ...photo, key: photoKey(photo.questId, photo.pinId) }))
  bump()
}

export async function getPhoto(questId: string, pinId: string): Promise<PhotoRecord | undefined> {
  return (await run('readonly', (s) => s.get(photoKey(questId, pinId)))) as PhotoRecord | undefined
}

export async function listPhotos(questId: string): Promise<PhotoRecord[]> {
  const all = (await run('readonly', (s) => s.index('questId').getAll(questId))) as PhotoRecord[]
  return all.sort((a, b) => a.at.localeCompare(b.at))
}

export async function deletePhoto(questId: string, pinId: string): Promise<void> {
  await run('readwrite', (s) => s.delete(photoKey(questId, pinId)))
  bump()
}

export async function clearPhotos(): Promise<void> {
  await run('readwrite', (s) => s.clear())
  bump()
}
