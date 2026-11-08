import { distanceMeters, pointInRing } from './geo.ts'
import { questTextEntries, type Quest } from './schema.ts'

/**
 * Problems a schema cannot express: things that parse fine but would confuse players.
 * An empty list means the quest is good to publish. Used by the content check and the editor.
 */
export function questProblems(quest: Quest): string[] {
  const problems: string[] = []

  for (const { path, text } of questTextEntries(quest)) {
    if (typeof text !== 'string' && !(quest.defaultLanguage in text)) {
      problems.push(`${path}: missing the default language "${quest.defaultLanguage}" (it is shown when a player's language is missing)`)
    }
  }

  if (quest.area) {
    for (const pin of quest.pins) {
      if (!pointInRing(pin.position, quest.area)) problems.push(`pins.${pin.id}: lies outside the quest area`)
    }
  }

  for (let i = 0; i < quest.pins.length; i++) {
    for (let j = i + 1; j < quest.pins.length; j++) {
      const a = quest.pins[i]
      const b = quest.pins[j]
      const gap = distanceMeters(a.position, b.position)
      if (gap < Math.max(a.radius, b.radius)) {
        problems.push(`pins.${a.id} and pins.${b.id}: only ${Math.round(gap)} m apart, so arriving at one counts as arriving at both`)
      }
    }
  }

  return problems
}
