import { categoryChain, type Category, type Extra } from 'pinpoint-core'

/**
 * One line icon per category, as the inside of a 24 by 24 SVG drawn with `currentColor`.
 * The type forces a new category to get an icon before the app compiles.
 */
export const CATEGORY_ICONS: Record<Category, string> = {
  other: '<path d="M12 21C12 21 5 14 5 9.5A7 7 0 0 1 19 9.5C19 14 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.5"/>',
  building: '<path d="M5 21V8L12 4L19 8V21"/><path d="M3.5 21H20.5M9 21V15H15V21M9 11H10M14 11H15"/>',
  house: '<path d="M3 11L12 4L21 11"/><path d="M5.5 9.5V20H18.5V9.5"/><path d="M10 20V14H14V20"/><path d="M16 6.5V4H18V8"/>',
  industrial: '<path d="M3 21V12L9 15V12L15 15V8H20V21Z"/><path d="M6 18.5H7M10.5 18.5H11.5M16.5 12H18M16.5 16H18"/>',
  chimney: '<path d="M9 21L10 7H14L15 21Z"/><path d="M8.5 7H15.5V4.5H8.5Z"/><path d="M4.5 21H19.5M9.6 12H14.4M9.3 16.5H14.7"/><path d="M17 3.5C18.5 2.5 17 1.5 18.5 .8"/>',
  mill: '<path d="M9.5 21L11 11H13L14.5 21Z"/><path d="M7 21H17"/><path d="M7 5L17 15M17 5L7 15"/><circle cx="12" cy="10" r="1"/>',
  farm: '<path d="M4 21V10L12 5L20 10V21Z"/><path d="M9 21V14H15V21M9 14L15 21M15 14L9 21M11 9H13"/>',
  religious: '<path d="M12 3V8M10 5H14"/><path d="M6 21V12L12 8L18 12V21"/><path d="M4 21H20M10 21V16A2 2 0 0 1 14 16V21"/>',
  church: '<path d="M12 2V6M10.5 3.5H13.5"/><path d="M9 9L12 6L15 9M9 9V21M15 9V21"/><path d="M3 21V14H9M15 14H21V21M2 21H22"/><path d="M11 21V17A1 1 0 0 1 13 17V21"/>',
  civic: '<path d="M4 21V10H20V21M2.5 21H21.5"/><path d="M10 10V5H14V10M12 5V2.5H15"/><path d="M11 21V16H13V21M6.5 13H7.5M16.5 13H17.5"/>',
  education: '<path d="M2 9L12 4L22 9L12 14Z"/><path d="M6 11.5V16C6 17.5 9 19 12 19S18 17.5 18 16V11.5"/><path d="M22 9V15"/>',
  culture: '<path d="M3 10L12 4L21 10"/><path d="M5 10V19M9 10V19M15 10V19M19 10V19M3 21H21"/>',
  theatre: '<path d="M3 6H21V19H3Z"/><path d="M3 6C7 8 8 12 8 19M21 6C17 8 16 12 16 19"/><path d="M12 9L12.9 11H15L13.3 12.3L14 14.5L12 13.2L10 14.5L10.7 12.3L9 11H11.1Z"/>',
  library: '<path d="M3 21H21"/><path d="M5 21V8H8.5V21M8.5 21V5H12V21M12 21V9H15.5V21"/><path d="M16.2 21L20.5 20L18.3 7.5L15.8 8.2"/>',
  health: '<circle cx="12" cy="12" r="9"/><path d="M12 7V17M7 12H17"/>',
  sports: '<circle cx="12" cy="12" r="9"/><path d="M3 12H21M12 3V21"/><path d="M5.2 5.5C8.5 8.5 8.5 15.5 5.2 18.5M18.8 5.5C15.5 8.5 15.5 15.5 18.8 18.5"/>',
  hotel: '<path d="M3 18V7M3 14H21V18M21 18V12A2 2 0 0 0 19 10H11V14M3 18H21"/><circle cx="7" cy="11.5" r="1.8"/>',
  food: '<circle cx="12" cy="12" r="4"/><path d="M5 4V10M3 4V8A2 2 0 0 0 7 8V4M5 10V20"/><path d="M19 4C17.5 6 17.5 10 19 12V20M19 4V12"/>',
  pub: '<path d="M6 8H15V19A1 1 0 0 1 14 20H7A1 1 0 0 1 6 19Z"/><path d="M15 10H17A2 2 0 0 1 19 12V14A2 2 0 0 1 17 16H15"/><path d="M6 8C6 5.5 9 5.5 9.5 7C10.5 5 13.5 5.5 13.5 7.5C14.5 7 15 7.5 15 8M9 12V16M12 12V16"/>',
  shop: '<path d="M5 8H19L18 21H6Z"/><path d="M9 8V6A3 3 0 0 1 15 6V8"/>',
  castle: '<path d="M4 21V7H7V9H9V7H11V9H13V7H15V9H17V7H20V21Z"/><path d="M10 21V15A2 2 0 0 1 14 15V21"/>',
  tower: '<path d="M9 21L10 9H14L15 21Z"/><path d="M8 9H16L15 5H9Z"/><path d="M12 5V2M6 21H18"/>',
  lighthouse: '<path d="M9.5 21L10.5 8H13.5L14.5 21Z"/><path d="M9 8H15L14 5H10ZM12 5V3M10.5 13H13.5M10 17H14M7 21H17"/><path d="M7 4L4 3M17 4L20 3M7 6.5L4 7M17 6.5L20 7"/>',
  clock: '<path d="M8 21V8L12 4L16 8V21M6.5 21H17.5"/><circle cx="12" cy="12" r="2.8"/><path d="M12 10.5V12L13 12.8"/>',
  square: '<path d="M4 8V4H8M16 4H20V8M20 16V20H16M8 20H4V16"/><circle cx="12" cy="12" r="3"/>',
  market: '<path d="M3 9L5 4H19L21 9"/><path d="M3 9C3 11 6 11 6 9C6 11 9 11 9 9C9 11 12 11 12 9C12 11 15 11 15 9C15 11 18 11 18 9C18 11 21 11 21 9"/><path d="M5 11V20H19V11M10 20V15H14V20"/>',
  street: '<path d="M8.5 21L10.5 3M15.5 21L13.5 3"/><path d="M12 20V17M12 14V11.5M12 9V6.5"/>',
  station: '<rect x="5" y="3" width="14" height="14" rx="3"/><path d="M5 11H19M8 14H8.01M16 14H16.01M8 20L6 22M16 20L18 22M8 17L7 20M16 17L17 20"/>',
  bridge: '<path d="M2 16H22M4 16C4 10 8 7 12 7S20 10 20 16"/><path d="M8 16V11M12 16V7M16 16V11"/><path d="M2.5 20C4.5 18.5 5.5 21.5 7.5 20S10.5 18.5 12.5 20 15.5 21.5 17.5 20 20.5 18.5 22 20"/>',
  harbour: '<path d="M3 15H21L18 20H6Z"/><path d="M12 3V15M12 4L18.5 13H12Z"/>',
  water: '<path d="M2 7C4 5.5 5 8.5 7 7S10 5.5 12 7 15 8.5 17 7 20 5.5 22 7"/><path d="M2 12C4 10.5 5 13.5 7 12S10 10.5 12 12 15 13.5 17 12 20 10.5 22 12"/><path d="M2 17C4 15.5 5 18.5 7 17S10 15.5 12 17 15 18.5 17 17 20 15.5 22 17"/>',
  fountain: '<path d="M4 21H20"/><path d="M6 21C6 18.5 8.5 17.5 12 17.5S18 18.5 18 21"/><path d="M12 17.5V11"/><path d="M8 11H16C16 13.2 14.3 14 12 14S8 13.2 8 11Z"/><path d="M12 8V5M9 9L7.5 6.5M15 9L16.5 6.5"/>',
  nature: '<path d="M2 20L9 8L13 14L15.5 11L22 20Z"/><circle cx="17" cy="6" r="2"/>',
  tree: '<path d="M12 3C8.5 3 6 5.5 6 9S8.5 15 12 15S18 12.5 18 9S15.5 3 12 3Z"/><path d="M12 15V21M9 21H15M12 17.5L9.5 15.5M12 12L14.5 10"/>',
  park: '<path d="M12 3L6 12H9L5 18H19L15 12H18Z"/><path d="M12 18V21"/>',
  garden: '<path d="M12 3C8 5 8 11 12 13C16 11 16 5 12 3Z"/><path d="M12 13V21M12 18C9 18 8 16 8 14C11 14 12 16 12 18M12 17C15 17 16 15 16 13C13 13 12 15 12 17"/>',
  playground: '<path d="M3 4H21M5 4L3 21M19 4L21 21M9 4V15M15 4V15M7.5 15H10.5M13.5 15H16.5"/>',
  viewpoint: '<path d="M2 12C5 6 19 6 22 12C19 18 5 18 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  monument: '<path d="M12 2L15 8V16H9V8Z"/><path d="M7 16H17V19H7ZM5 19H19V22H5Z"/>',
  memorial: '<rect x="5" y="4" width="14" height="12" rx="1"/><path d="M8 8H16M8 11.5H13M8 16V21M16 16V21"/>',
  ruins: '<path d="M5 21V9M9 21V9M5 9C5 5 9 5 9 9"/><path d="M15 21V13L17 11L19 13V21M3 21H21M11 21L12 19L13.5 21"/>',
  art: '<path d="M12 3A9 9 0 1 0 12 21C14 21 14 19 13 18S13 15 15 15H17A4 4 0 0 0 21 11C21 6.5 17 3 12 3Z"/><circle cx="7.5" cy="11" r=".8"/><circle cx="10.5" cy="7.5" r=".8"/><circle cx="15" cy="7.5" r=".8"/>',
  cemetery: '<path d="M6 21V13M4 15H8M12 21V9M9.5 12H14.5M18 21V14M16 16H20M3 21H21"/>',
  attraction: '<circle cx="12" cy="10" r="7"/><path d="M12 3V17M5 10H19M7 5L17 15M17 5L7 15M12 10L7 21M12 10L17 21M4 21H20"/>',
  zoo: '<path d="M12 13C9 13 7 15.5 7 17.5C7 19.5 9 20 12 18.8C15 20 17 19.5 17 17.5C17 15.5 15 13 12 13Z"/><circle cx="7" cy="10" r="1.8"/><circle cx="10.5" cy="6.5" r="1.8"/><circle cx="13.5" cy="6.5" r="1.8"/><circle cx="17" cy="10" r="1.8"/>',
}

/** The icon markup for a category, or for the nearest parent that has one. */
export function categoryIconMarkup(category: Category): string {
  for (const id of categoryChain(category)) {
    const icon = CATEGORY_ICONS[id]
    if (icon) return icon
  }
  return CATEGORY_ICONS.other
}

/** Tiny marks for the clue types a player used. Types without a mark are left out of the stamp. */
export const CLUE_GLYPHS: Record<string, string> = {
  text: '<path d="M4 6H20M4 12H20M4 18H14"/>',
  distance: '<path d="M3 13H21M3 7V19M21 7V19M9 13V9M15 13V9"/>',
  direction: '<path d="M12 3L19 21L12 17L5 21Z"/>',
  map: '<path d="M3 6L9 4L15 6L21 4V18L15 20L9 18L3 20Z"/><path d="M9 4V18M15 6V20"/>',
  photo: '<path d="M3 8H7L9 5H15L17 8H21V19H3Z"/><circle cx="12" cy="13" r="3.5"/>',
  audio: '<path d="M4 9H8L13 5V19L8 15H4Z"/><path d="M16 9C17.5 10.5 17.5 13.5 16 15M18.5 6.5C21.5 9.5 21.5 14.5 18.5 17.5"/>',
  wordShape: '<path d="M3 18L8 6L13 18M4.8 14H11.2M16 18H21"/>',
}

export const CLUE_GLYPH_ORDER = ['text', 'wordShape', 'audio', 'photo', 'map', 'distance', 'direction'] as const

/** Bonus marks: the symbol inside a small round stamp. */
export const EXTRA_SYMBOLS: Record<Extra, string> = {
  quiz: '<path d="M12 3L14.6 9L21 9.6L16.2 13.8L17.6 20L12 16.8L6.4 20L7.8 13.8L3 9.6L9.4 9Z"/>',
  photo: CLUE_GLYPHS.photo,
  night: '<path d="M20 14.5A8 8 0 1 1 9.5 4 6.5 6.5 0 0 0 20 14.5Z"/>',
  sunrise: '<path d="M4 17H20M7 17A5 5 0 0 1 17 17"/><path d="M12 5V8M4.5 9L6.5 11M19.5 9L17.5 11M2 13H5M19 13H22"/>',
  rain: '<path d="M12 3C12 3 6 10 6 14A6 6 0 0 0 18 14C18 10 12 3 12 3Z"/>',
  together: '<circle cx="8" cy="8" r="3"/><circle cx="16" cy="8" r="3"/><path d="M2.5 20C2.5 14.5 13.5 14.5 13.5 20M10.5 20C10.5 14.5 21.5 14.5 21.5 20"/>',
}
