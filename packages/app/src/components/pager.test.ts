import { pageCapacity } from './Pager.tsx'

describe('page capacity', () => {
  it('shows everything that fits, without page buttons', () => {
    // 400 px: rows of 56 with 10 between fit 6 (6*56 + 5*10 = 386).
    expect(pageCapacity(400, 56, 10, 1, 4)).toBe(6)
    expect(pageCapacity(400, 56, 10, 1, 6)).toBe(6)
  })
  it('leaves room for the page buttons once a list needs them', () => {
    // 7 items do not fit in 6 rows, so the buttons take 52 px: 348 px holds 5 rows.
    expect(pageCapacity(400, 56, 10, 1, 7)).toBe(5)
  })
  it('counts columns', () => {
    expect(pageCapacity(400, 100, 10, 2, 20)).toBe(6)
  })
  it('always shows at least one row, however small the space', () => {
    expect(pageCapacity(20, 56, 10, 1, 9)).toBe(1)
    expect(pageCapacity(20, 56, 10, 2, 9)).toBe(2)
  })
  it('shows everything before the size is known', () => {
    expect(pageCapacity(0, 56, 10, 1, 9)).toBe(9)
  })
})
