import { describe, expect, it } from 'vitest'
import { flicker } from './flicker'

describe('flicker', () => {
  it('stays within +-3% of the steady value', () => {
    for (let t = 0; t < 200; t += 0.13) {
      for (const seed of [0, 1, 2.5]) {
        const f = flicker(t, seed)
        expect(f).toBeGreaterThanOrEqual(0.97)
        expect(f).toBeLessThanOrEqual(1.03)
      }
    }
  })

  it('actually varies, and differs per lamp', () => {
    const a = Array.from({ length: 50 }, (_, i) => flicker(i * 0.1, 0))
    expect(Math.max(...a) - Math.min(...a)).toBeGreaterThan(0.02)
    expect(flicker(3, 0)).not.toBeCloseTo(flicker(3, 1), 4)
  })
})
