import { destinationPoint, distanceMeters, pointInRing, questArea, ringArea, ringsOverlap } from './geo.ts'
import { hashString } from './stamp-style.ts'
import { KNOWN_CLUE_TYPES, type Clue, type Fact, type KnownClue, type Location, type PhotoStep, type Pin, type Position, type Quest, type Quiz } from './schema.ts'

export type Fix = Position & {
  /** Reported accuracy radius in metres. */
  accuracy: number
}

/** Fixes less accurate than this never count as arrived. */
export const MAX_ACCURACY_M = 60

export type Proximity = 'arrived' | 'near' | 'far'

/**
 * - `arrived`: within the pin radius with a trustworthy fix.
 * - `near`: could be inside once the fix settles (close, or the fix is vague).
 * - `far`: clearly outside.
 */
export function proximity(fix: Fix, pin: Pick<Pin, 'position' | 'radius'>) {
  const distance = distanceMeters(fix, pin.position)
  let state: Proximity = 'far'
  if (distance <= pin.radius && fix.accuracy <= MAX_ACCURACY_M) state = 'arrived'
  else if (distance - fix.accuracy <= pin.radius) state = 'near'
  return { state, distance }
}

export function formatDistance(meters: number): string {
  if (meters >= 10000) return `${Math.round(meters / 1000)} km`
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`
  if (meters >= 100) return `${Math.round(meters / 10) * 10} m`
  return `${Math.max(5, Math.round(meters / 5) * 5)} m`
}

/** Rotation of an on-screen arrow: where to go relative to where the phone points. */
export function arrowRotation(bearing: number, heading?: number): number {
  return (((bearing - (heading ?? 0)) % 360) + 360) % 360
}

export type Stamp = {
  questId: string
  pinId: string
  /** ISO timestamp of arrival. */
  at: string
  /** Clue types the player looked at, in no particular order. */
  clues: string[]
  /** How many hints the player asked for before checking in. */
  hints: number
  /** How many things could have cost a star at this pin: its hints and its questions. See `stampPoints`. */
  chances: number
  /** Answers to the pin's questions, by the question's index in `pin.arrival`. */
  quiz?: Record<string, 'correct' | 'wrong'>
  /** A photo of the pin is in the album. */
  photo?: boolean
  /** The sky at arrival, when it was dark or around sunrise. */
  sky?: 'night' | 'sunrise'
  /** Only recorded when the player allowed a weather lookup. */
  weather?: 'rain'
}

/** Small bonus marks beside a stamp. They reward things anyone can choose to do. */
export const EXTRAS = ['quiz', 'photo', 'night', 'sunrise', 'rain'] as const
export type Extra = (typeof EXTRAS)[number]

/** The extra marks a stamp has earned, in a fixed order. Answering any question earns the quiz mark, right or wrong. */
export function extrasOf(stamp: Stamp): Extra[] {
  const earned: Record<Extra, boolean> = {
    quiz: Object.keys(stamp.quiz ?? {}).length > 0,
    photo: stamp.photo === true,
    night: stamp.sky === 'night',
    sunrise: stamp.sky === 'sunrise',
    rain: stamp.weather === 'rain',
  }
  return EXTRAS.filter((e) => earned[e])
}

/** Pins the player can work on now: only the next one when the quest is linear. */
export function playablePins(quest: Quest, stamped: ReadonlySet<string>): Pin[] {
  const open = quest.pins.filter((p) => !stamped.has(p.id))
  return quest.order === 'linear' ? open.slice(0, 1) : open
}

export type ClueState = { clue: Clue; index: number; visible: boolean; }

/** Types that tell the player where to go. Expert mode hides them. */
export const ASSISTIVE_TYPES = ['distance', 'direction', 'map'] as const
const ASSISTIVE = new Set<string>(ASSISTIVE_TYPES)

/** Every pin starts with three stars. */
export const MAX_POINTS = 3

/**
 * Stars left after `slips` (hints asked, questions answered wrong) out of `chances` things that could go
 * wrong. The pin keeps all three stars until fewer than three chances are left untouched: with five chances,
 * the first two slips are free; when everything goes wrong, no star is left. A pin with fewer than three
 * chances counts as having three, so each slip there costs a star.
 */
export function pointsLeft(chances: number, slips: number): number {
  return Math.max(0, Math.min(MAX_POINTS, Math.max(chances, MAX_POINTS) - slips))
}

/** How many things can cost a star at a pin: each hint to ask for, and each question. */
export function pinChances(pin: Pick<Pin, 'clues' | 'arrival'>): number {
  const hints = pin.clues.filter((clue) => isPlayable(clue) && clue.reveal?.onRequest).length
  return hints + arrivalPages(pin).filter((page) => page.kind === 'quiz').length
}

/** Questions of a stamp answered wrong. */
export function wrongAnswers(stamp: Pick<Stamp, 'quiz'>): number {
  return Object.values(stamp.quiz ?? {}).filter((answer) => answer === 'wrong').length
}

/** The stars a stamp has: three, less the slips that went beyond the pin's spare chances. */
export function stampPoints(stamp: Pick<Stamp, 'hints' | 'chances' | 'quiz'>): number {
  return pointsLeft(stamp.chances, stamp.hints + wrongAnswers(stamp))
}

/** The pages after check-in: the stamp, then the pin's steps in order, with the photo page right after the stamp when the pin does not place it. */
export type ArrivalPage =
  | { kind: 'stamp' }
  | { kind: 'photo'; step?: PhotoStep }
  | { kind: 'fact'; step: Fact }
  | { kind: 'quiz'; step: Quiz; index: number }

export function arrivalPages(pin: Pick<Pin, 'arrival'>): ArrivalPage[] {
  const steps = pin.arrival.flatMap((step, index): ArrivalPage[] => {
    if (step.type === 'fact') return [{ kind: 'fact', step: step as Fact }]
    if (step.type === 'quiz') return [{ kind: 'quiz', step: step as Quiz, index }]
    if (step.type === 'photo') return [{ kind: 'photo', step: step as PhotoStep }]
    return []
  })
  const placed = steps.some((page) => page.kind === 'photo')
  return [{ kind: 'stamp' }, ...(placed ? [] : [{ kind: 'photo' } as const]), ...steps]
}

export type ClueContext = {
  /** Indexes of clues the player asked for. */
  requested: ReadonlySet<number>
  /** Hide distance, direction and map for players who know the city. */
  expert?: boolean
}

export function resolveClues(pin: Pick<Pin, 'clues'>, ctx: ClueContext): ClueState[] {
  return pin.clues.flatMap((clue, index): ClueState[] => {
    if (!isPlayable(clue)) return []
    if (ctx.expert && ASSISTIVE.has(clue.type)) return []
    const r = clue.reveal
    if (r?.onRequest && !ctx.requested.has(index)) return [{ clue, index, visible: false }]
    return [{ clue, index, visible: true }]
  })
}

export function isPlayable(clue: Clue): clue is KnownClue {
  return (KNOWN_CLUE_TYPES as readonly string[]).includes(clue.type)
}

/** The cells of a word-shape clue: the first letter of each word when shown, every other letter hidden. */
export function wordShape(word: string, showFirstLetter = true): { char: string; known: boolean }[] {
  let atStart = true
  return Array.from(word).map((char) => {
    if (!/\p{L}|\p{N}/u.test(char)) {
      atStart = true
      return { char, known: true }
    }
    const known = showFirstLetter && atStart
    atStart = false
    return { char: known ? char : '_', known }
  })
}

/** How many letters a word-shape clue spells, for "(11)" style hints. */
export function wordLength(word: string): number {
  return Array.from(word).filter((c) => /\p{L}|\p{N}/u.test(c)).length
}

/** Locations containing the position, smallest first (city before province before country). */
export function locationsContaining(position: Position, locations: Location[]): Location[] {
  return locations
    .filter((l) => pointInRing(position, l.polygon))
    .sort((a, b) => ringArea(a.polygon) - ringArea(b.polygon))
}

/** Quests whose area overlaps the location. */
export function questsInLocation(location: Location, quests: Quest[]): Quest[] {
  return quests.filter((q) => ringsOverlap(questArea(q), location.polygon))
}

export function resolveText(
  text: string | Record<string, string>,
  languages: readonly string[],
  fallback = 'en',
): string {
  if (typeof text === 'string') return text
  for (const lang of languages) {
    const base = lang.toLowerCase().split('-')[0]
    const hit = text[lang] ?? text[base]
    if (hit) return hit
  }
  return text[fallback] ?? Object.values(text)[0] ?? ''
}

/**
 * A circle that contains the pin without being centred on it, for the "rough area" map clue. The
 * centre is moved by a fixed amount that depends on the pin, so it does not change between visits
 * and cannot be averaged out by reloading.
 */
export function roughArea(pin: Pick<Pin, 'id' | 'position' | 'radius'>): { center: Position; radius: number } {
  const radius = Math.max(200, pin.radius * 4)
  const seed = hashString(pin.id)
  const shift = radius * (0.2 + 0.3 * ((seed % 100) / 100))
  return { center: destinationPoint(pin.position, shift, seed % 360), radius }
}
