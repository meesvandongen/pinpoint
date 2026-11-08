import { collageLayout, POLAROID_ASPECT } from './collage.ts'

const options = { width: 1080, height: 1350, top: 170, bottom: 190, margin: 60, seed: 'q' }

describe('collage layout', () => {
  it('lays out 1 to 24 photos inside the canvas without overlap', () => {
    for (let count = 1; count <= 24; count++) {
      const slots = collageLayout(count, options)
      expect(slots).toHaveLength(count)
      for (const s of slots) {
        expect(s.width / s.height).toBeCloseTo(POLAROID_ASPECT, 5)
        // The box around a tilted frame is a little larger than the frame.
        const tilt = (Math.abs(s.rotation) * Math.PI) / 180
        const halfW = (s.width * Math.cos(tilt) + s.height * Math.sin(tilt)) / 2
        const halfH = (s.width * Math.sin(tilt) + s.height * Math.cos(tilt)) / 2
        expect(s.x - halfW).toBeGreaterThan(0)
        expect(s.x + halfW).toBeLessThan(options.width)
        expect(s.y - halfH).toBeGreaterThan(options.top - 20)
        expect(s.y + halfH).toBeLessThan(options.height - options.bottom + 20)
      }
      for (let i = 0; i < slots.length; i++) {
        for (let j = i + 1; j < slots.length; j++) {
          const a = slots[i]
          const b = slots[j]
          const dx = Math.abs(a.x - b.x) - (a.width + b.width) / 2
          const dy = Math.abs(a.y - b.y) - (a.height + b.height) / 2
          // Boxes may touch at the corners once tilted, but never sit on top of each other.
          expect(dx < -a.width * 0.35 && dy < -a.height * 0.35).toBe(false)
        }
      }
    }
  })
  it('makes photos smaller as there are more of them', () => {
    expect(collageLayout(1, options)[0].width).toBeGreaterThan(collageLayout(6, options)[0].width)
    expect(collageLayout(6, options)[0].width).toBeGreaterThan(collageLayout(12, options)[0].width)
  })
  it('is reproducible from the seed and differs between seeds', () => {
    expect(collageLayout(5, options)).toEqual(collageLayout(5, options))
    expect(collageLayout(5, { ...options, seed: 'other' })).not.toEqual(collageLayout(5, options))
  })
  it('returns nothing for no photos', () => {
    expect(collageLayout(0, options)).toEqual([])
  })
})
