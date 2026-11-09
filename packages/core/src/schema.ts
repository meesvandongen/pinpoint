import { z } from 'zod'
import { CATEGORY_IDS } from './categories.ts'

/** Most characters per kind of text. Text has to fit on a screen that never scrolls. */
export const LIMITS = {
  title: 40,
  name: 40,
  description: 240,
  hint: 140,
  prompt: 100,
  question: 120,
  option: 48,
  caption: 100,
  word: 32,
} as const

const Language = z.string().regex(/^[a-z]{2,3}(-[A-Za-z0-9]+)*$/, 'use a language code such as en or nl')

/**
 * Text that is either one plain string or a map of language code to string.
 * A plain string is shown in every language.
 */
export const localized = (max: number) =>
  z.union([z.string().min(1).max(max), z.record(Language, z.string().min(1).max(max))])
export type LocalizedText = string | Record<string, string>

export const Lat = z.number().min(-90).max(90)
export const Lng = z.number().min(-180).max(180)

/** A WGS 84 coordinate. The same shape gitvfs-cms map fields write. */
export const Position = z.object({ lat: Lat, lng: Lng })
export type Position = z.infer<typeof Position>

/** A polygon as `{ lat, lng }` corners. It does not need to repeat the first point. */
export const Ring = z.array(Position).min(3)
export type Ring = z.infer<typeof Ring>

export const Slug = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'use lowercase letters, digits and dashes')

/**
 * A file the content points at, as a path under `content/`, such as `media/chimney.jpg`. Never a web
 * address: a picture hosted elsewhere could change after review, and would tell its host who plays.
 */
export const MediaPath = z
  .string()
  .min(1)
  .refine((path) => !/^([a-z][a-z0-9+.-]*:|\/)/i.test(path) && !path.split('/').includes('..'), {
    message: 'use a path under content/, such as media/chimney.jpg, not a web address',
  })

/**
 * When a clue becomes visible. Without a rule it is visible from the start; with `onRequest` it is a hint the
 * player has to ask for. Strict, so an old `afterSeconds` is an error and not a silently different quest.
 */
export const Reveal = z.object({ onRequest: z.boolean().optional() }).strict()
export type Reveal = z.infer<typeof Reveal>

const reveal = { reveal: Reveal.optional() }

const KnownClue = z.discriminatedUnion('type', [
  z.object({ type: z.literal('distance'), ...reveal }),
  z.object({ type: z.literal('direction'), ...reveal }),
  z.object({
    type: z.literal('map'),
    view: z.enum(['full', 'area']).default('full'),
    ...reveal,
  }),
  z.object({ type: z.literal('text'), text: localized(LIMITS.hint), ...reveal }),
  z.object({
    type: z.literal('photo'),
    src: MediaPath,
    alt: localized(LIMITS.caption).optional(),
    ...reveal,
  }),
  z.object({
    type: z.literal('audio'),
    src: MediaPath,
    caption: localized(LIMITS.caption).optional(),
    ...reveal,
  }),
  z.object({
    type: z.literal('wordShape'),
    /** The word to find. The clue shows its length and, optionally, its first letter. */
    word: localized(LIMITS.word),
    showFirstLetter: z.boolean().default(true),
    ...reveal,
  }),
])

export const KNOWN_CLUE_TYPES = [
  'distance',
  'direction',
  'map',
  'text',
  'photo',
  'audio',
  'wordShape',
] as const
export type KnownClueType = (typeof KNOWN_CLUE_TYPES)[number]

/** A clue type this version does not know. It is kept so newer content still loads, and skipped when playing. */
const UnknownClue = z
  .object({ type: z.string().min(1), ...reveal })
  .loose()
  .refine((c) => !(KNOWN_CLUE_TYPES as readonly string[]).includes(c.type), {
    message: 'invalid fields for a known clue type',
  })

export const Clue = z.union([KnownClue, UnknownClue])
export type Clue = z.infer<typeof Clue>
export type KnownClue = z.infer<typeof KnownClue>

export const Quiz = z
  .object({
    question: localized(LIMITS.question),
    options: z.array(localized(LIMITS.option)).min(2).max(4),
    answer: z.number().int().min(0),
  })
  .refine((q) => q.answer < q.options.length, { message: 'answer must point at an option' })
export type Quiz = z.infer<typeof Quiz>

export const STAMP_SHAPES = ['round', 'postage', 'hex', 'ticket', 'oval'] as const
export type StampShape = (typeof STAMP_SHAPES)[number]

export const StampStyle = z.object({
  shape: z.enum(STAMP_SHAPES).optional(),
  ink: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  /** Overrides the icon of the pin's category. */
  icon: z.enum(CATEGORY_IDS).optional(),
})
export type StampStyle = z.infer<typeof StampStyle>

export const Pin = z.object({
  id: Slug,
  title: localized(LIMITS.title),
  /** Broad category, used to pick an icon. `other` always has one. */
  category: z.enum(CATEGORY_IDS).default('other'),
  position: Position,
  /** Metres around the position that count as arrived. */
  radius: z.number().min(10).max(500).default(40),
  clues: z.array(Clue).min(1),
  photoPrompt: localized(LIMITS.prompt).optional(),
  quiz: Quiz.optional(),
  stamp: StampStyle.optional(),
})
export type Pin = z.infer<typeof Pin>

const questShape = {
  title: localized(LIMITS.title),
  description: localized(LIMITS.description).optional(),
  /** Language used when a text has no entry for the player's language. */
  defaultLanguage: Language.default('en'),
  order: z.enum(['linear', 'free']).default('linear'),
  /** Where the quest is played. Derived from the pins when missing. */
  area: Ring.optional(),
  pins: z.array(Pin).min(1).max(24),
}

const uniquePins = {
  message: 'pin ids must be unique within a quest',
  path: ['pins'] as PropertyKey[],
}
const hasUniquePins = (q: { pins: { id: string }[] }) => new Set(q.pins.map((p) => p.id)).size === q.pins.length

/** What `content/quests/<id>.json` holds. The id is the file name, so the file does not repeat it. */
export const QuestFile = z.object(questShape).refine(hasUniquePins, uniquePins)
export type QuestFile = z.infer<typeof QuestFile>

/** A quest as the game uses it: the file plus its id. */
export const Quest = z.object({ id: Slug, ...questShape }).refine(hasUniquePins, uniquePins)
export type Quest = z.infer<typeof Quest>

const locationShape = { name: localized(LIMITS.name), polygon: Ring }

/** What `content/locations/<id>.json` holds. */
export const LocationFile = z.object(locationShape)
export type LocationFile = z.infer<typeof LocationFile>

export const Location = z.object({ id: Slug, ...locationShape })
export type Location = z.infer<typeof Location>

/** `quests/tilburg.json` → `tilburg`. */
export function idFromPath(path: string): string {
  return (path.split('/').pop() ?? path).replace(/\.json$/i, '')
}

/** `index.json`, generated when the app is built: files to load, relative to the content root. */
export const ContentIndex = z.object({
  locations: z.array(z.string()),
  quests: z.array(z.string()),
})
export type ContentIndex = z.infer<typeof ContentIndex>

/** Every localized text of a quest with where it sits, so tools can list languages and find gaps. */
export function questTextEntries(quest: Quest): { path: string; text: LocalizedText }[] {
  const entries: { path: string; text: LocalizedText }[] = []
  const add = (path: string, text: LocalizedText | undefined) => {
    if (text !== undefined) entries.push({ path, text })
  }
  add('title', quest.title)
  add('description', quest.description)
  for (const pin of quest.pins) {
    const at = `pins.${pin.id}`
    add(`${at}.title`, pin.title)
    add(`${at}.photoPrompt`, pin.photoPrompt)
    if (pin.quiz) {
      add(`${at}.quiz.question`, pin.quiz.question)
      pin.quiz.options.forEach((option, i) => add(`${at}.quiz.options[${i}]`, option))
    }
    pin.clues.forEach((clue, i) => {
      const where = `${at}.clues[${i}]`
      if (clue.type === 'text') add(`${where}.text`, (clue as KnownClue & { type: 'text' }).text)
      if (clue.type === 'photo') add(`${where}.alt`, (clue as KnownClue & { type: 'photo' }).alt)
      if (clue.type === 'audio') add(`${where}.caption`, (clue as KnownClue & { type: 'audio' }).caption)
      if (clue.type === 'wordShape') add(`${where}.word`, (clue as KnownClue & { type: 'wordShape' }).word)
    })
  }
  return entries
}

export function questTexts(quest: Quest): LocalizedText[] {
  return questTextEntries(quest).map((e) => e.text)
}

/** Every language that has an entry in some text of the quest: the default language, then the others alphabetically. */
export function questLanguages(quest: Quest): string[] {
  const found = new Set<string>()
  for (const text of questTexts(quest)) {
    if (typeof text !== 'string') for (const lang of Object.keys(text)) found.add(lang)
  }
  found.delete(quest.defaultLanguage)
  return [quest.defaultLanguage, ...[...found].sort()]
}
