import { fitGrid } from './FitGrid.tsx'

const base = { aspect: 1 / 1.17, gap: 12, minWidth: 108, maxWidth: 420 }

describe('fitting a grid to the room', () => {
  it('uses the biggest cells that hold every item, in the number of columns that gives them', () => {
    // A phone: two columns of 3 pins beat three narrow columns.
    const phone = fitGrid({ ...base, width: 330, height: 560, count: 3 })
    expect(phone.cols).toBe(2)
    expect(phone.rows).toBe(2)
    expect(phone.perPage).toBe(3)
    expect(phone.width).toBeCloseTo((330 - 12) / 2, 0)
  })
  it('puts a wide, short screen in more columns', () => {
    const wide = fitGrid({ ...base, width: 1000, height: 420, count: 6 })
    expect(wide.cols).toBeGreaterThan(2)
    expect(wide.rows).toBeLessThan(3)
  })
  it('never lets the cells outgrow the room or the largest size', () => {
    const roomy = fitGrid({ ...base, width: 1400, height: 1200, count: 3 })
    expect(roomy.width).toBeLessThanOrEqual(420)
    const fit = fitGrid({ ...base, width: 330, height: 400, count: 4 })
    expect(fit.cols * fit.width + (fit.cols - 1) * 12).toBeLessThanOrEqual(330 + 0.5)
    expect(fit.rows * fit.height + (fit.rows - 1) * 12).toBeLessThanOrEqual(400 + 0.5)
  })
  it('keeps the shape of the cells', () => {
    const f = fitGrid({ ...base, width: 400, height: 700, count: 5 })
    expect(f.width / f.height).toBeCloseTo(base.aspect, 5)
  })
  it('pages only when the cells would get too small, and then fills the room with cells of a readable size', () => {
    const many = fitGrid({ ...base, width: 330, height: 560, count: 24 })
    expect(many.perPage).toBeLessThan(24)
    expect(many.width).toBeGreaterThanOrEqual(108)
    expect(many.cols * many.rows).toBe(many.perPage)
    // The page buttons need room, so the rows leave space for them.
    expect(many.rows * many.height + (many.rows - 1) * 12).toBeLessThanOrEqual(560 - 52 + 0.5)
  })
  it('shows everything before the size is known', () => {
    expect(fitGrid({ ...base, width: 0, height: 0, count: 7 }).perPage).toBe(7)
  })
})
