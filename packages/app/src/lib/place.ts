import { questsInLocation, ringArea, type Location, type Quest } from 'pinpoint-core'

/** The smallest place that lists the quest: where "more quests" leads. */
export function placeOf(locations: Location[], quests: Quest[], quest: Quest): Location | undefined {
  return locations
    .filter((l) => questsInLocation(l, quests).some((q) => q.id === quest.id))
    .sort((a, b) => ringArea(a.polygon) - ringArea(b.polygon))[0]
}
