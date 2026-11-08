import { hashString, splitTitle, type Category, type Extra, type StampShape } from 'pinpoint-core'
import { CLUE_GLYPHS, CLUE_GLYPH_ORDER, EXTRA_SYMBOLS, categoryIconMarkup } from './icons.ts'

/** Text from quest files goes into SVG markup, so it is escaped here. */
export function escapeXml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]!)
}

const FONT = 'font-family="Courier Prime, ui-monospace, monospace" font-weight="700" stroke="none"'

const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1)}…` : text)

/** `08.11.26` */
export function shortDate(iso: string): string {
  const d = new Date(iso)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${String(d.getFullYear()).slice(2)}`
}

export type StampSvgProps = {
  shape: StampShape
  ink: string
  icon: Category
  title: string
  /** Text on the ring, shown beside the date. */
  place: string
  /** Day of arrival, as an ISO timestamp. */
  at: string
  /** Short label such as "PIN 3 / 7". */
  label: string
  /** Clue types the player used. */
  clues: readonly string[]
  /** Makes the tilt and the ink gaps differ from stamp to stamp, and stay the same for one stamp. */
  seed: string
}

function text(x: number, y: number, size: number, spacing: number, value: string, anchor: 'start' | 'middle' | 'end' = 'middle') {
  return `<text ${FONT} x="${x}" y="${y}" font-size="${size}" letter-spacing="${spacing}" text-anchor="${anchor}" fill="currentColor">${escapeXml(value)}</text>`
}

/** A symbol drawn into a square of `size` at (x, y). */
function symbol(markup: string, x: number, y: number, size: number) {
  return `<svg x="${x}" y="${y}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">${markup}</svg>`
}

function iconAt(category: Category, x: number, y: number, size: number) {
  return `<g stroke-width="1.5">${symbol(categoryIconMarkup(category), x, y, size)}</g>`
}

function clueRow(clues: readonly string[], y: number, size: number, cx: number) {
  const marks = CLUE_GLYPH_ORDER.filter((c) => clues.includes(c))
  if (marks.length === 0) return ''
  const gap = 4
  const start = cx - (marks.length * size + (marks.length - 1) * gap) / 2
  return marks
    .map((c, i) => `<g stroke-width="2.6">${symbol(CLUE_GLYPHS[c], start + i * (size + gap), y, size)}</g>`)
    .join('')
}

function arcText(pathId: string, value: string, size: number, spacing: number) {
  return `<text ${FONT} font-size="${size}" letter-spacing="${spacing}" text-anchor="middle" fill="currentColor"><textPath href="#${pathId}" startOffset="50%">${escapeXml(value)}</textPath></text>`
}

type Body = (p: StampSvgProps, id: string) => string

const bodies: Record<StampShape, Body> = {
  round: (p, id) =>
    `<circle cx="100" cy="100" r="92" stroke-width="5"/><circle cx="100" cy="100" r="84" stroke-width="1.5"/><circle cx="100" cy="100" r="57" stroke-width="2"/>` +
    `<path id="t${id}" d="M36 100A64 64 0 0 1 164 100" stroke="none"/><path id="b${id}" d="M27 100A73 73 0 0 0 173 100" stroke="none"/>` +
    arcText(`t${id}`, clip(p.title.toUpperCase(), 16), 11, 2) +
    arcText(`b${id}`, `${clip(p.place.toUpperCase(), 9)} · ${shortDate(p.at)}`, 11, 2) +
    `<circle cx="31.5" cy="100" r="2.6" fill="currentColor" stroke="none"/><circle cx="168.5" cy="100" r="2.6" fill="currentColor" stroke="none"/>` +
    iconAt(p.icon, 64, 58, 72) +
    clueRow(p.clues, 133, 14, 100),

  postage: (p) =>
    `<rect x="14" y="10" width="172" height="180" stroke-width="8" stroke-dasharray="0.5 9" stroke-linecap="round"/><rect x="28" y="24" width="144" height="152" stroke-width="2.5"/>` +
    text(38, 46, 12, 1, p.label, 'start') +
    text(162, 46, 12, 0, shortDate(p.at).slice(0, 5), 'end') +
    iconAt(p.icon, 62, 56, 76) +
    text(100, 150, 13, 1.5, clip(p.title.toUpperCase(), 13)) +
    clueRow(p.clues, 156, 14, 100),

  hex: (p) =>
    `<polygon points="100,8 180,54 180,146 100,192 20,146 20,54" stroke-width="5" stroke-linejoin="round"/><polygon points="100,20 169,60 169,140 100,180 31,140 31,60" stroke-width="1.5"/>` +
    text(100, 52, 11, 2, p.label) +
    iconAt(p.icon, 66, 60, 68) +
    text(100, 142, 11, 1, clip(p.title.toUpperCase(), 12)) +
    clueRow(p.clues, 148, 12, 100),

  ticket: (p) => {
    const [first, second] = splitTitle(p.title, 9)
    return (
      `<path d="M18 46H182V80A14 14 0 0 0 182 108V150H18V108A14 14 0 0 0 18 80Z" stroke-width="4" stroke-linejoin="round"/>` +
      `<path d="M72 56V140" stroke-width="2" stroke-dasharray="4 5"/>` +
      iconAt(p.icon, 24, 64, 42) +
      clueRow(p.clues, 112, 10, 45) +
      text(82, 70, 10, 1, p.label, 'start') +
      text(82, 92, 15, 1, first, 'start') +
      text(82, 109, 15, 1, second, 'start') +
      text(82, 132, 10, 0, shortDate(p.at), 'start')
    )
  },

  oval: (p) =>
    `<ellipse cx="100" cy="100" rx="94" ry="68" stroke-width="5"/><ellipse cx="100" cy="100" rx="85" ry="59" stroke-width="1.5"/>` +
    text(100, 64, 11, 2, clip(p.title.toUpperCase(), 13)) +
    iconAt(p.icon, 72, 68, 56) +
    clueRow(p.clues, 127, 12, 100) +
    text(100, 152, 10, 1.5, shortDate(p.at)),
}

/** The ink effect: speckled gaps and a slightly wobbly edge, different for every stamp. */
function inkFilter(id: string, seed: number) {
  return (
    `<filter id="ink${id}" x="-10%" y="-10%" width="120%" height="120%">` +
    `<feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" seed="${(seed % 90) + 3}" result="n"/>` +
    `<feColorMatrix in="n" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 -2.4 2.0" result="m"/>` +
    `<feComposite in="SourceGraphic" in2="m" operator="in" result="s"/>` +
    `<feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="${seed % 50}" result="w"/>` +
    `<feDisplacementMap in="s" in2="w" scale="3" xChannelSelector="R" yChannelSelector="G"/></filter>`
  )
}

/** A little margin around the 200 by 200 drawing, so a tilted stamp never touches the edge. */
function wrap(label: string, ink: string, id: string, seed: number, inner: string, viewBox = '-8 -8 216 216') {
  const tilt = (seed % 15) - 7
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" role="img" aria-label="${escapeXml(label)}"><defs>${inkFilter(id, seed)}</defs>` +
    `<g filter="url(#ink${id})"><g transform="rotate(${tilt} 100 100)" style="color:${escapeXml(ink)}" fill="none" stroke="currentColor" stroke-linecap="round" opacity=".94">${inner}</g></g></svg>`
  )
}

/** One stamp as a standalone SVG string. */
export function stampSvg(props: StampSvgProps): string {
  const seed = hashString(`${props.seed}|${props.title}|${props.at}`)
  const id = seed.toString(36)
  return wrap(props.title, props.ink, id, seed, bodies[props.shape](props, id))
}

export type QuestStampProps = {
  ink: string
  title: string
  /** Pins collected over pins in the quest, such as "3/3". */
  count: string
  at: string
  seed: string
}

/** The starburst stamp for finishing a quest. */
export function questStampSvg(props: QuestStampProps): string {
  const seed = hashString(`${props.seed}|quest|${props.at}`)
  const id = seed.toString(36)
  const points: string[] = []
  for (let i = 0; i < 40; i++) {
    const angle = (i * Math.PI) / 20 - Math.PI / 2
    const r = i % 2 ? 84 : 95
    points.push(`${(100 + r * Math.cos(angle)).toFixed(1)},${(100 + r * Math.sin(angle)).toFixed(1)}`)
  }
  const inner =
    `<polygon points="${points.join(' ')}" stroke-width="3.5" stroke-linejoin="round"/><circle cx="100" cy="100" r="74" stroke-width="2.5"/>` +
    `<path id="t${id}" d="M44 100A56 56 0 0 1 156 100" stroke="none"/><path id="b${id}" d="M34 100A66 66 0 0 0 166 100" stroke="none"/>` +
    arcText(`t${id}`, '★ PINPOINT ★', 10, 2) +
    arcText(`b${id}`, clip(props.title.toUpperCase(), 16), 10, 2) +
    text(100, 114, 42, 0, props.count) +
    text(100, 133, 10, 1, shortDate(props.at))
  return wrap(props.title, props.ink, id, seed, inner)
}

/** A small round bonus mark. */
export function extraMarkSvg(extra: Extra, ink: string, label: string, seed: string): string {
  const n = hashString(`${seed}|${extra}`)
  const id = n.toString(36)
  const tilt = (n % 13) - 6
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80" role="img" aria-label="${escapeXml(label)}"><defs>` +
    `<filter id="ink${id}"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" seed="${(n % 90) + 3}" result="n"/>` +
    `<feColorMatrix in="n" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 -2.4 2.0" result="m"/>` +
    `<feComposite in="SourceGraphic" in2="m" operator="in"/></filter></defs>` +
    `<g filter="url(#ink${id})"><g transform="rotate(${tilt} 40 40)" style="color:${escapeXml(ink)}" fill="none" stroke="currentColor" stroke-linecap="round" opacity=".94">` +
    `<circle cx="40" cy="40" r="35" stroke-width="3"/><circle cx="40" cy="40" r="29" stroke-width="1"/>` +
    `<g stroke-width="1.6">${symbol(EXTRA_SYMBOLS[extra], 22, 22, 36)}</g></g></g></svg>`
  )
}

/** A plain line icon for lists and cards. */
export function iconSvg(category: Category, size = 24): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${categoryIconMarkup(category)}</svg>`
}
