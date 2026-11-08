import type { Stamp } from 'pinpoint-core'

const STAMPS = 'pinpoint.stamps.v1'
const EXPERT = 'pinpoint.expert.v1'

export function loadStamps(): Stamp[] {
  try {
    const raw = localStorage.getItem(STAMPS)
    return raw ? (JSON.parse(raw) as Stamp[]) : []
  } catch {
    return []
  }
}

export function saveStamps(stamps: Stamp[]) {
  try {
    localStorage.setItem(STAMPS, JSON.stringify(stamps))
  } catch {
    // Private mode or full storage: the game still works for this session.
  }
}

export function loadExpert(): boolean {
  try {
    return localStorage.getItem(EXPERT) === '1'
  } catch {
    return false
  }
}

export function saveExpert(on: boolean) {
  try {
    localStorage.setItem(EXPERT, on ? '1' : '0')
  } catch {
    // ignore
  }
}
