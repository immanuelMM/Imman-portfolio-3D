import { describe, expect, it } from 'vitest'
import { TIER_SETTINGS } from '../lib/quality'
import { buildLedInstances } from './leds'
import { RACKS, RACK_SIZE } from './layout'

describe('buildLedInstances', () => {
  it('respects the count and is deterministic for a seed', () => {
    const a = buildLedInstances(300, 7)
    const b = buildLedInstances(300, 7)
    expect(a.phases).toHaveLength(300)
    expect(a.matrices).toHaveLength(300 * 16)
    expect(Array.from(a.matrices.slice(0, 64))).toEqual(Array.from(b.matrices.slice(0, 64)))
    const c = buildLedInstances(300, 8)
    expect(Array.from(c.phases.slice(0, 8))).not.toEqual(Array.from(a.phases.slice(0, 8)))
  })

  it('builds the tier counts', () => {
    for (const tier of Object.values(TIER_SETTINGS)) {
      expect(buildLedInstances(tier.ledCount, 3).phases).toHaveLength(tier.ledCount)
    }
  })

  it('puts every LED inside its rack bounding box (front face included)', () => {
    const { matrices, racks } = buildLedInstances(600, 11)
    for (let i = 0; i < racks.length; i++) {
      const rack = RACKS[racks[i]]
      const wx = matrices[i * 16 + 12]
      const wy = matrices[i * 16 + 13]
      const wz = matrices[i * 16 + 14]
      // into the rack's local frame
      const dx = wx - rack.position[0]
      const dz = wz - rack.position[2]
      const cos = Math.cos(rack.yaw)
      const sin = Math.sin(rack.yaw)
      const lx = dx * cos - dz * sin
      const lz = dx * sin + dz * cos
      expect(Math.abs(lx)).toBeLessThanOrEqual(RACK_SIZE.w / 2)
      expect(wy).toBeGreaterThan(0)
      expect(wy).toBeLessThan(RACK_SIZE.h)
      expect(lz).toBeLessThanOrEqual(RACK_SIZE.d / 2 + 0.02)
      expect(lz).toBeGreaterThan(0)
    }
  })

  it('never puts two LEDs on one slot', () => {
    const { matrices } = buildLedInstances(600, 2)
    const seen = new Set<string>()
    for (let i = 0; i < 600; i++) {
      const key = [12, 13, 14].map((k) => matrices[i * 16 + k].toFixed(4)).join(',')
      expect(seen.has(key)).toBe(false)
      seen.add(key)
    }
  })
})
