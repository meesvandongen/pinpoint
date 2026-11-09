import { z } from 'zod'
import { defineCollection, field, geoPoint, geoPolygon, type CommitMessageContext } from 'gitvfs-cms'
import { CATEGORY_IDS, LIMITS, MediaPath, STAMP_SHAPES, type LocalizedText } from 'pinpoint-core'

// The editor's own copy of the content model. It describes the same files as `pinpoint-core`, with
// the editor hints (map fields, the clue list, language-aware texts) on top. `model.test.ts`
// checks that both accept and reject the same content, so the two cannot drift apart.

const Language = z.string().regex(/^[a-z]{2,3}(-[A-Za-z0-9]+)*$/, 'use a language code such as en or nl')
const Slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'use lowercase letters, digits and dashes')

/** A text in one language, or one per language. */
const localized = (max: number, config: { label: string; description?: string; multiline?: boolean }) =>
  z
    .union([z.string().min(1).max(max), z.record(Language, z.string().min(1).max(max))])
    .check(
      field({
        label: config.label,
        description: config.description,
        fieldType: 'localized',
        customData: { localized: { max, multiline: config.multiline } },
      }),
    )

const pinId = Slug.check(
  field({
    label: 'Id',
    description: 'Lowercase letters, digits and dashes. Players never see it, but saved stamps are filed under it, so do not change it once the quest is published.',
  }),
)

const reveal = z.object({ onRequest: z.boolean().optional() }).strict().optional()

const KNOWN_TYPES = ['distance', 'direction', 'map', 'text', 'photo', 'audio', 'wordShape']

const Clue = z.union([
  z.discriminatedUnion('type', [
    z.object({ type: z.literal('distance'), reveal }),
    z.object({ type: z.literal('direction'), reveal }),
    z.object({ type: z.literal('map'), view: z.enum(['full', 'area']).default('full'), reveal }),
    z.object({ type: z.literal('text'), text: localized(LIMITS.hint, { label: 'Text' }), reveal }),
    z.object({ type: z.literal('photo'), src: MediaPath, alt: localized(LIMITS.caption, { label: 'Description' }).optional(), reveal }),
    z.object({ type: z.literal('audio'), src: MediaPath, caption: localized(LIMITS.caption, { label: 'Caption' }).optional(), reveal }),
    z.object({ type: z.literal('wordShape'), word: localized(LIMITS.word, { label: 'The word' }), showFirstLetter: z.boolean().default(true), reveal }),
  ]),
  // A clue type this version does not know is kept, but a known type with wrong fields is an error.
  z
    .object({ type: z.string().min(1), reveal })
    .loose()
    .refine((clue) => !KNOWN_TYPES.includes(clue.type), { message: 'invalid fields for a known clue type' }),
])

const Quiz = z
  .object({
    question: localized(LIMITS.question, { label: 'Question' }),
    options: z
      .array(localized(LIMITS.option, { label: 'Answer' }))
      .min(2)
      .max(4)
      .check(field({ label: 'Answers', description: 'Two to four.' })),
    answer: z.number().int().min(0).check(field({ label: 'Right answer', description: 'Which answer is right, counting from 0.' })),
  })
  .refine((quiz) => quiz.answer < quiz.options.length, { message: 'The right answer has to point at one of the answers', path: ['answer'] })

const Pin = z.object({
  id: pinId,
  title: localized(LIMITS.title, { label: 'Name' }),
  category: z.enum(CATEGORY_IDS).default('other').check(field({ label: 'Kind of place', description: 'Picks the icon on the stamp.' })),
  position: geoPoint({ label: 'Where it is', description: 'Click the map, or search for an address.', zoom: 14, pointZoom: 17 }),
  radius: z.number().min(10).max(500).default(40).check(field({ label: 'Arrival radius (metres)', description: 'How close a player has to be. GPS in a street is rarely better than 20 m.' })),
  clues: z
    .array(Clue)
    .min(1)
    .check(field({ label: 'Clues', fieldType: 'clues', description: 'What the player gets to find the place.' })),
  photoPrompt: localized(LIMITS.prompt, { label: 'Photo suggestion' }).optional(),
  quiz: Quiz.optional().check(field({ label: 'Question about the place', fieldType: 'quiz' })),
  stamp: z
    .object({
      shape: z.enum(STAMP_SHAPES).optional().check(field({ label: 'Shape' })),
      ink: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'use a colour such as #5b34a8').optional().check(field({ label: 'Ink', description: 'A colour like #5b34a8. Leave empty to let the game pick.' })),
      icon: z.enum(CATEGORY_IDS).optional().check(field({ label: 'Icon', description: 'Only if it should differ from the kind of place.' })),
    })
    .optional()
    .check(field({ label: 'Stamp', description: 'The game picks a shape, icon and ink from the kind of place. Set them here to choose yourself.' })),
})

// The file name is the quest's id, so the file does not repeat it. In the editor, the slug is the id.
export const questSchema = z
  .object({
    title: localized(LIMITS.title, { label: 'Title' }),
    description: localized(LIMITS.description, { label: 'Description', multiline: true }).optional(),
    defaultLanguage: Language.default('en').check(field({ label: 'Default language', description: 'Used when a player\'s language is missing. Every text with languages has to include it.' })),
    order: z.enum(['linear', 'free']).default('linear').check(field({ label: 'Order', description: 'In order: one pin at a time. Any order: players pick.' })),
    area: geoPolygon({ label: 'Quest area', description: 'Where the quest is played. Leave empty to use a box around the pins.', zoom: 13, maxPoints: 50 }).optional(),
    pins: z.array(Pin).min(1).max(24).check(field({ label: 'Pins' })),
  })
  .refine((quest) => new Set(quest.pins.map((p) => p.id)).size === quest.pins.length, { message: 'Pin ids must be unique within a quest', path: ['pins'] })

export const locationSchema = z.object({
  name: localized(LIMITS.name, { label: 'Name' }),
  polygon: geoPolygon({ label: 'Area', description: 'Draw the outline. Quests show under every location they overlap.', zoom: 11, maxPoints: 200 }),
})

const commitMessage = ({ action, path, previousPath }: CommitMessageContext) => {
  const file = path.replace(/^content\//, '')
  return action === 'rename' ? `content: rename ${previousPath?.replace(/^content\//, '')} to ${file}` : `content: ${action} ${file}`
}

export const collections = [
  defineCollection({
    name: 'quests',
    label: 'Quests',
    folder: 'content/quests',
    format: 'json',
    schema: questSchema,
    // The slug is the quest's id and the file name. Type it when the title has several languages.
    slugField: 'title',
    labelField: 'title',
    commitMessage,
  }),
  defineCollection({
    name: 'locations',
    label: 'Locations',
    folder: 'content/locations',
    format: 'json',
    schema: locationSchema,
    slugField: 'name',
    labelField: 'name',
    commitMessage,
  }),
]

export type { LocalizedText }
