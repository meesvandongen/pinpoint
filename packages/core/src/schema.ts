import { z } from 'zod'
import { CATEGORY_IDS } from './categories.ts'

/** Text that is either one plain string or a map of language code to string. */
export const LocalizedText = z.union([
  z.string().min(1),
  z.record(z.string().min(2), z.string().min(1)),
])
export type LocalizedText = z.infer<typeof LocalizedText>

export const Lat = z.number().min(-90).max(90)
export const Lng = z.number().min(-180).max(180)

export const Position = z.object({ lat: Lat, lng: Lng })
export type Position = z.infer<typeof Position>

/** A polygon ring as GeoJSON-style `[lng, lat]` pairs. It does not need to repeat the first point. */
export const Ring = z.array(z.tuple([Lng, Lat])).min(3)
export type Ring = z.infer<typeof Ring>

const Slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'use lowercase letters, digits and dashes')

/** When a clue becomes visible. Without a rule it is visible from the start. */
export const Reveal = z.object({
  afterSeconds: z.number().int().positive().optional(),
  onRequest: z.boolean().optional(),
})
export type Reveal = z.infer<typeof Reveal>

const reveal = { reveal: Reveal.optional() }

const KnownClue = z.discriminatedUnion('type', [
  z.object({ type: z.literal('distance'), ...reveal }),
  z.object({
    type: z.literal('direction'),
    mode: z.enum(['arrow', 'cardinal']).default('arrow'),
    ...reveal,
  }),
  z.object({
    type: z.literal('map'),
    view: z.enum(['full', 'area']).default('full'),
    ...reveal,
  }),
  z.object({ type: z.literal('text'), text: LocalizedText, ...reveal }),
  z.object({ type: z.literal('photo'), src: z.string().min(1), alt: LocalizedText.optional(), ...reveal }),
])

export const KNOWN_CLUE_TYPES = ['distance', 'direction', 'map', 'text', 'photo'] as const
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
    question: LocalizedText,
    options: z.array(LocalizedText).min(2).max(4),
    answer: z.number().int().min(0),
  })
  .refine((q) => q.answer < q.options.length, { message: 'answer must point at an option' })
export type Quiz = z.infer<typeof Quiz>

export const StampStyle = z.object({
  shape: z.enum(['round', 'postage', 'hex', 'ticket', 'oval']).default('round'),
  ink: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  icon: z.string().optional(),
})
export type StampStyle = z.infer<typeof StampStyle>

export const Pin = z.object({
  id: Slug,
  title: LocalizedText,
  /** Broad category, used to pick an icon. `other` always has one. */
  category: z.enum(CATEGORY_IDS).default('other'),
  position: Position,
  /** Metres around the position that count as arrived. */
  radius: z.number().min(10).max(500).default(40),
  clues: z.array(Clue).min(1),
  photoPrompt: LocalizedText.optional(),
  quiz: Quiz.optional(),
  stamp: StampStyle.optional(),
})
export type Pin = z.infer<typeof Pin>

export const Quest = z
  .object({
    id: Slug,
    title: LocalizedText,
    description: LocalizedText.optional(),
    /** Language used when a text has no entry for the player's language. */
    defaultLanguage: z.string().min(2).default('en'),
    order: z.enum(['linear', 'free']).default('linear'),
    /** Where the quest is played. Derived from the pins when missing. */
    area: Ring.optional(),
    pins: z.array(Pin).min(1),
  })
  .refine((q) => new Set(q.pins.map((p) => p.id)).size === q.pins.length, {
    message: 'pin ids must be unique within a quest',
    path: ['pins'],
  })
export type Quest = z.infer<typeof Quest>

export const Location = z.object({
  id: Slug,
  name: LocalizedText,
  polygon: Ring,
})
export type Location = z.infer<typeof Location>

/** `content/index.json`: files to load, relative to the content root. */
export const ContentIndex = z.object({
  locations: z.array(z.string()),
  quests: z.array(z.string()),
})
export type ContentIndex = z.infer<typeof ContentIndex>
