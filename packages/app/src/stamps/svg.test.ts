import { CATEGORY_IDS, STAMP_SHAPES } from 'pinpoint-core'
import { CATEGORY_ICONS } from './icons.ts'
import { extraMarkSvg, iconSvg, pointStampSvg, questStampSvg, shortDate, stampSvg, type StampSvgProps } from './svg.ts'

const base: StampSvgProps = {
  shape: 'round',
  ink: '#5b34a8',
  icon: 'chimney',
  title: 'The chimney',
  place: 'Wool city',
  at: '2026-11-08T10:00:00',
  label: 'PIN 1 / 3',
  clues: ['text', 'distance', 'direction'],
  seed: 'tilburg-textile/chimney',
}

function parse(svg: string) {
  const doc = new DOMParser().parseFromString(svg, 'image/svg+xml')
  expect(doc.querySelector('parsererror'), svg.slice(0, 120)).toBeNull()
  return doc
}

describe('stamp markup', () => {
  it('is well formed XML for every shape', () => {
    for (const shape of STAMP_SHAPES) {
      const doc = parse(stampSvg({ ...base, shape }))
      expect(doc.documentElement.getAttribute('aria-label')).toBe('The chimney')
    }
  })
  it('is the same every time for the same stamp and differs between stamps', () => {
    expect(stampSvg(base)).toBe(stampSvg(base))
    expect(stampSvg(base)).not.toBe(stampSvg({ ...base, seed: 'other', title: 'Another' }))
  })
  it('draws one mark per clue type used, in a fixed order, and none for unknown types', () => {
    const marks = (clues: string[]) => (stampSvg({ ...base, clues }).match(/stroke-width="2\.6"/g) ?? []).length
    expect(marks([])).toBe(0)
    expect(marks(['distance'])).toBe(1)
    expect(marks(['direction', 'distance', 'smell'])).toBe(2)
    expect(stampSvg({ ...base, clues: ['direction', 'text'] })).toBe(stampSvg({ ...base, clues: ['text', 'direction'] }))
  })
  it('escapes text that comes from quest files', () => {
    const svg = stampSvg({ ...base, title: '<script>alert(1)</script> & "x"', place: '</text><g onload="x">' })
    expect(svg).not.toContain('<script>')
    expect(svg).not.toContain('onload="x">')
    const doc = parse(svg)
    expect(doc.querySelector('script')).toBeNull()
    expect(doc.documentElement.getAttribute('aria-label')).toBe('<script>alert(1)</script> & "x"')
  })
  it('clips long titles', () => {
    expect(stampSvg({ ...base, title: 'A very long title that cannot fit on a ring' })).toContain('…')
  })
  it('splits a title over two lines on tickets', () => {
    const svg = stampSvg({ ...base, shape: 'ticket', title: 'Market clock' })
    expect(svg).toContain('>MARKET<')
    expect(svg).toContain('>CLOCK<')
  })
  it('formats short dates', () => {
    expect(shortDate('2026-11-08T10:00:00')).toBe('08.11.26')
  })
})

describe('quest stamp and marks', () => {
  it('draws the starburst with the count', () => {
    const doc = parse(questStampSvg({ ink: '#2b2a26', title: 'Wool city', count: '3/3', at: base.at, seed: 'q' }))
    expect(doc.querySelectorAll('polygon')).toHaveLength(1)
    expect(doc.documentElement.innerHTML).toContain('3/3')
  })
  it('draws a mark for every extra', () => {
    for (const extra of ['quiz', 'photo', 'night', 'sunrise', 'rain'] as const) {
      parse(extraMarkSvg(extra, '#1b4a96', extra, 'seed'))
    }
  })
})

describe('icons', () => {
  it('has a well formed icon for every category', () => {
    for (const id of CATEGORY_IDS) {
      expect(CATEGORY_ICONS[id].length, id).toBeGreaterThan(20)
      parse(iconSvg(id))
    }
  })
})

describe('point stamps', () => {
  it('is well formed, the same every time, and differs per point', () => {
    parse(pointStampSvg('quest/pin', 0))
    expect(pointStampSvg('quest/pin', 0)).toBe(pointStampSvg('quest/pin', 0))
    expect(pointStampSvg('quest/pin', 0)).not.toBe(pointStampSvg('quest/pin', 1))
  })
  it('is drawn in the current colour, so the page decides the ink', () => {
    expect(pointStampSvg('quest/pin', 2)).toContain('currentColor')
  })
})
