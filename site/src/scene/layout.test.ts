import { describe, expect, it } from 'vitest'
import { agents } from '../data/agents'
import { AGENT_PANELS, AGENT_PANELS_TALL, ARC, HERO_CAMERA, panelFacingError, RACKS, ROOM } from './layout'

describe('agent panel layout', () => {
  it('has seven panels whose ids match agents.ts', () => {
    expect(AGENT_PANELS).toHaveLength(7)
    const ids = AGENT_PANELS.map((p) => p.agentId)
    expect(new Set(ids).size).toBe(7)
    expect([...ids].sort()).toEqual(agents.map((a) => a.id).sort())
  })

  it('puts Lead in the centre', () => {
    const lead = AGENT_PANELS.find((p) => p.agentId === 'lead')!
    expect(lead.position[0]).toBeCloseTo(0)
    expect(Math.abs(lead.rotationY)).toBeCloseTo(0)
  })

  it('faces every panel toward the hero camera within 35 degrees', () => {
    for (const panel of AGENT_PANELS) expect(panelFacingError(panel)).toBeLessThan(35)
  })

  it('keeps panels from overlapping and inside the room', () => {
    const sorted = [...AGENT_PANELS].sort((a, b) => a.position[0] - b.position[0])
    for (let i = 1; i < sorted.length; i++) {
      const a = sorted[i - 1]
      const b = sorted[i]
      // distance between centres must exceed the width so the slabs never touch
      const d = Math.hypot(b.position[0] - a.position[0], b.position[2] - a.position[2])
      expect(d).toBeGreaterThan(ARC.panelSize[0] + 0.05)
    }
    for (const p of AGENT_PANELS) {
      expect(Math.abs(p.position[0])).toBeLessThan(ROOM.halfWidth)
      expect(p.position[2]).toBeGreaterThan(ROOM.back)
    }
  })

  it('keeps the arc clear of the side rack rows', () => {
    const sideRack = Math.min(...RACKS.map((r) => Math.abs(r.position[0])).filter((x) => x > 4))
    // the rack front is half a rack depth inside the rack's centre line
    for (const p of AGENT_PANELS) expect(Math.abs(p.position[0]) + ARC.panelSize[0] / 2).toBeLessThan(sideRack - 0.5)
  })

  it('looks from inside the room', () => {
    expect(HERO_CAMERA.position[2]).toBeLessThan(ROOM.front)
  })

  it('keeps the portrait arc free of overlaps with a visible gap, in the same order', () => {
    expect(AGENT_PANELS_TALL.map((p) => p.agentId)).toEqual(AGENT_PANELS.map((p) => p.agentId))
    for (let i = 1; i < AGENT_PANELS_TALL.length; i++) {
      const a = AGENT_PANELS_TALL[i - 1]
      const b = AGENT_PANELS_TALL[i]
      const d = Math.hypot(b.position[0] - a.position[0], b.position[2] - a.position[2])
      expect(d - a.size[0]).toBeGreaterThan(0.15)
    }
  })
})
