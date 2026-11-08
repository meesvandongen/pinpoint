import { useSyncExternalStore } from 'react'

/** A tiny observable value, readable outside React and from it. */
export type Store<T> = {
  get(): T
  set(next: T | ((current: T) => T)): void
  subscribe(listener: () => void): () => void
}

export function createStore<T>(initial: T): Store<T> {
  let value = initial
  const listeners = new Set<() => void>()
  return {
    get: () => value,
    set(next) {
      const resolved = typeof next === 'function' ? (next as (current: T) => T)(value) : next
      if (Object.is(resolved, value)) return
      value = resolved
      listeners.forEach((listener) => listener())
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}

export function useStore<T>(store: Store<T>): T
export function useStore<T, S>(store: Store<T>, select: (value: T) => S): S
export function useStore<T, S>(store: Store<T>, select?: (value: T) => S) {
  return useSyncExternalStore(
    store.subscribe,
    () => (select ? select(store.get()) : store.get()),
    () => (select ? select(store.get()) : store.get()),
  )
}

/** A store that keeps its value in localStorage. Storage that is missing or full is ignored. */
export function persistentStore<T>(key: string, initial: T, revive: (stored: unknown) => T = (v) => v as T): Store<T> {
  let start = initial
  try {
    const raw = localStorage.getItem(key)
    if (raw !== null) start = revive(JSON.parse(raw))
  } catch {
    start = initial
  }
  const store = createStore(start)
  store.subscribe(() => {
    try {
      localStorage.setItem(key, JSON.stringify(store.get()))
    } catch {
      // Private mode or full storage: the app still works for this visit.
    }
  })
  return store
}
