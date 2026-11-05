import { describe, expect, it } from 'vitest'
import { flicker, POWER_ON, powerOn } from './flicker'

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

describe('powerOn', () => {
  it('is dark before a panel starts and steady at 1 once its flicker-in is over', () => {
    for (let i = 0; i < 7; i++) {
      const start = i * POWER_ON.stagger
      expect(powerOn(start - 0.01, i)).toBe(0)
      expect(powerOn(start + POWER_ON.duration + 1e-6, i)).toBe(1)
      expect(powerOn(start + 5, i)).toBe(1)
    }
  })

  it('stutters while powering on: dark dips and lit bursts, always within 0..1', () => {
    const samples = Array.from({ length: 60 }, (_, k) => powerOn(0.05 + k * 0.014, 0))
    expect(samples.every((v) => v >= 0 && v <= 1)).toBe(true)
    expect(samples.some((v) => v <= 0.05)).toBe(true)
    expect(samples.some((v) => v >= 0.35)).toBe(true)
  })

  it('is deterministic and differs per panel', () => {
    expect(powerOn(0.4, 2)).toBe(powerOn(0.4, 2))
    const row = (i: number) => Array.from({ length: 40 }, (_, k) => powerOn(0.4 + k * 0.01, i)).join()
    expect(row(1)).not.toBe(row(4))
  })

  it('has every panel on within about two seconds', () => {
    expect(6 * POWER_ON.stagger + POWER_ON.duration).toBeLessThan(2)
  })
})
