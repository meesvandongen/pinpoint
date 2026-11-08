import type { ReactNode } from 'react'
import { categoryChain, type Category } from 'pinpoint-core'

const line = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' } as const

/** One icon per category. The type forces a new category to get an icon before the app compiles. */
export const CATEGORY_ICONS: Record<Category, ReactNode> = {
  other: <g {...line}><path d="M12 21C12 21 5 14 5 9.5A7 7 0 0 1 19 9.5C19 14 12 21 12 21Z" /><circle cx="12" cy="9.5" r="2.5" /></g>,
  building: <g {...line}><path d="M5 21V8L12 4L19 8V21" /><path d="M3.5 21H20.5M9 21V15H15V21M9 11H10M14 11H15" /></g>,
  industrial: <g {...line}><path d="M9 21L10 7H14L15 21Z" /><path d="M8.5 7H15.5V4.5H8.5Z" /><path d="M4.5 21H19.5M9.6 12H14.4M9.3 16.5H14.7" /></g>,
  religious: <g {...line}><path d="M12 3V8M10 5H14" /><path d="M6 21V12L12 8L18 12V21" /><path d="M4 21H20M10 21V16A2 2 0 0 1 14 16V21" /></g>,
  civic: <g {...line}><path d="M3 9L12 4L21 9Z" /><path d="M5 9V18M9.5 9V18M14.5 9V18M19 9V18M3 21H21M4 18H20" /></g>,
  culture: <g {...line}><path d="M3 10L12 4L21 10" /><path d="M5 10V19M9 10V19M15 10V19M19 10V19M3 21H21" /></g>,
  education: <g {...line}><path d="M2 9L12 4L22 9L12 14Z" /><path d="M6 11.5V16C6 17.5 9 19 12 19S18 17.5 18 16V11.5" /><path d="M22 9V15" /></g>,
  tower: <g {...line}><path d="M9 21L10 9H14L15 21Z" /><path d="M8 9H16L15 5H9Z" /><path d="M12 5V2M6 21H18" /></g>,
  square: <g {...line}><path d="M4 8V4H8M16 4H20V8M20 16V20H16M8 20H4V16" /><circle cx="12" cy="12" r="3" /></g>,
  market: <g {...line}><path d="M3 9L5 4H19L21 9" /><path d="M3 9C3 11 6 11 6 9C6 11 9 11 9 9C9 11 12 11 12 9C12 11 15 11 15 9C15 11 18 11 18 9C18 11 21 11 21 9" /><path d="M5 11V20H19V11M10 20V15H14V20" /></g>,
  station: <g {...line}><rect x="5" y="3" width="14" height="14" rx="3" /><path d="M5 11H19M8 14H8.01M16 14H16.01M8 20L6 22M16 20L18 22M8 17L7 20M16 17L17 20" /></g>,
  bridge: <g {...line}><path d="M2 16H22M4 16C4 10 8 7 12 7S20 10 20 16" /><path d="M8 16V11M12 16V7M16 16V11" /><path d="M2.5 20C4.5 18.5 5.5 21.5 7.5 20S10.5 18.5 12.5 20 15.5 21.5 17.5 20 20.5 18.5 22 20" /></g>,
  harbour: <g {...line}><path d="M3 15H21L18 20H6Z" /><path d="M12 3V15M12 4L18.5 13H12Z" /></g>,
  park: <g {...line}><path d="M12 3L6 12H9L5 18H19L15 12H18Z" /><path d="M12 18V21" /></g>,
  monument: <g {...line}><path d="M12 2L15 8V16H9V8Z" /><path d="M7 16H17V19H7ZM5 19H19V22H5Z" /></g>,
  art: <g {...line}><path d="M12 3A9 9 0 1 0 12 21C14 21 14 19 13 18S13 15 15 15H17A4 4 0 0 0 21 11C21 6.5 17 3 12 3Z" /><circle cx="7.5" cy="11" r=".8" /><circle cx="10.5" cy="7.5" r=".8" /><circle cx="15" cy="7.5" r=".8" /></g>,
}

/** The icon for a category, or the nearest parent that has one. */
export function categoryIcon(category: Category): ReactNode {
  for (const id of categoryChain(category)) {
    const icon = CATEGORY_ICONS[id]
    if (icon) return icon
  }
  return CATEGORY_ICONS.other
}

const glyph = { fill: 'none', stroke: 'currentColor', strokeWidth: 2.6, strokeLinecap: 'round', strokeLinejoin: 'round' } as const

/** Tiny marks for the clue types a player used. Unknown types get no mark. */
export const CLUE_GLYPHS: Record<string, ReactNode> = {
  text: <g {...glyph}><path d="M4 6H20M4 12H20M4 18H14" /></g>,
  distance: <g {...glyph}><path d="M3 13H21M3 7V19M21 7V19M9 13V9M15 13V9" /></g>,
  direction: <g {...glyph}><path d="M12 3L19 21L12 17L5 21Z" /></g>,
  map: <g {...glyph}><path d="M3 6L9 4L15 6L21 4V18L15 20L9 18L3 20Z" /><path d="M9 4V18M15 6V20" /></g>,
  photo: <g {...glyph}><path d="M3 8H7L9 5H15L17 8H21V19H3Z" /><circle cx="12" cy="13" r="3.5" /></g>,
}
