import { resolveText, stampStyle, type Pin, type Quest, type Stamp } from 'pinpoint-core'
import type { Translator } from '../i18n/index.ts'
import type { QuestStampProps, StampSvgProps } from './svg.ts'

const text = (value: Parameters<typeof resolveText>[0], quest: Quest, t: Translator) =>
  resolveText(value, t.contentLanguages, quest.defaultLanguage)

/** Everything the stamp drawing needs for one pin of a quest, in the player's language. */
export function stampPropsFor(quest: Quest, pin: Pin, stamp: Stamp, t: Translator): StampSvgProps {
  const index = quest.pins.findIndex((p) => p.id === pin.id)
  return {
    ...stampStyle(pin),
    title: text(pin.title, quest, t),
    place: text(quest.title, quest, t),
    at: stamp.at,
    label: t.t('play.pinOf', { n: index + 1, total: quest.pins.length }).toUpperCase(),
    clues: stamp.clues,
    seed: `${quest.id}/${pin.id}`,
  }
}

/** The starburst for a finished quest, dated by the last stamp. */
export function questStampPropsFor(quest: Quest, stamps: Stamp[], t: Translator): QuestStampProps {
  const mine = stamps.filter((s) => s.questId === quest.id)
  const last = mine.map((s) => s.at).sort().at(-1) ?? new Date().toISOString()
  return {
    ink: '#2b2a26',
    title: text(quest.title, quest, t),
    count: `${Math.min(mine.length, quest.pins.length)}/${quest.pins.length}`,
    at: last,
    seed: quest.id,
  }
}
