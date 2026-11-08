/**
 * Broad pin categories, each with a parent to fall back to for icons: chimney -> industrial -> building -> other.
 * Add a category here and the app's icon table fails to compile until it gets an icon.
 * The list is meant to grow; see docs/plan.md for how coverage is checked against OpenStreetMap tags.
 */
export const CATEGORY_PARENT = {
  other: null,
  building: 'other',
  industrial: 'building',
  religious: 'building',
  civic: 'building',
  culture: 'building',
  education: 'building',
  tower: 'building',
  square: 'other',
  market: 'square',
  station: 'other',
  bridge: 'other',
  harbour: 'other',
  park: 'other',
  monument: 'other',
  art: 'other',
} as const satisfies Record<string, string | null>

export type Category = keyof typeof CATEGORY_PARENT
export const CATEGORY_IDS = Object.keys(CATEGORY_PARENT) as [Category, ...Category[]]

/** The category followed by its parents, ending at `other`. */
export function categoryChain(category: Category): Category[] {
  const chain: Category[] = []
  let current: Category | null = category
  while (current && !chain.includes(current)) {
    chain.push(current)
    current = CATEGORY_PARENT[current]
  }
  return chain
}
