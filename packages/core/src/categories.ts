/**
 * Broad pin categories, each with a parent to fall back to for icons:
 * chimney -> industrial -> building -> other.
 *
 * Add a category here and the app's icon table does not compile until it gets an icon.
 * `osm.ts` maps OpenStreetMap tags onto these, and its test reports how much of what people
 * actually map is covered, so the list grows where it matters.
 */
export const CATEGORY_PARENT = {
  other: null,

  building: 'other',
  house: 'building',
  industrial: 'building',
  chimney: 'industrial',
  mill: 'industrial',
  farm: 'building',
  religious: 'building',
  church: 'religious',
  civic: 'building',
  education: 'building',
  culture: 'building',
  theatre: 'culture',
  library: 'culture',
  health: 'building',
  sports: 'building',
  hotel: 'building',
  food: 'building',
  pub: 'food',
  shop: 'building',
  castle: 'building',
  tower: 'building',
  lighthouse: 'tower',
  clock: 'tower',

  square: 'other',
  market: 'square',
  street: 'other',
  station: 'other',
  bridge: 'other',
  harbour: 'other',

  water: 'other',
  fountain: 'water',
  nature: 'other',
  tree: 'nature',
  park: 'other',
  garden: 'park',
  playground: 'park',
  viewpoint: 'other',

  monument: 'other',
  memorial: 'monument',
  ruins: 'monument',
  art: 'other',
  cemetery: 'other',
  attraction: 'other',
  zoo: 'attraction',
} as const satisfies Record<string, string | null>

export type Category = keyof typeof CATEGORY_PARENT
export const CATEGORY_IDS = Object.keys(CATEGORY_PARENT) as [Category, ...Category[]]

export function isCategory(value: string): value is Category {
  return Object.hasOwn(CATEGORY_PARENT, value)
}

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
