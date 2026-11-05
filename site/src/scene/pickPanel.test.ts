import { describe, expect, it } from 'vitest'
import { AGENT_PANELS, AGENT_PANELS_TALL, HERO_CAMERA, type Vec3 } from './layout'
import { isSceneTarget, isTap, pickPanel } from './pickPanel'

const toward = (from: Vec3, to: Vec3): Vec3 => [to[0] - from[0], to[1] - from[1], to[2] - from[2]]

describe('pickPanel', () => {
  it('hits each panel when aimed at its centre from the hero camera', () => {
    for (const panels of [AGENT_PANELS, AGENT_PANELS_TALL])
      for (const p of panels) {
        const ray = { origin: HERO_CAMERA.position, direction: toward(HERO_CAMERA.position, p.position) }
        expect(pickPanel(ray, panels)).toBe(p.agentId)
      }
  })

  it('misses just outside a panel edge, and hits it with padding', () => {
    const lead = AGENT_PANELS.find((p) => p.agentId === 'lead')!
    const aim: Vec3 = [lead.position[0] + lead.size[0] / 2 + 0.05, lead.position[1], lead.position[2]]
    const ray = { origin: HERO_CAMERA.position, direction: toward(HERO_CAMERA.position, aim) }
    // that point is also off the neighbours
    expect(pickPanel(ray, AGENT_PANELS)).not.toBe('lead')
    expect(pickPanel(ray, AGENT_PANELS, 0.15)).toBe('lead')
  })

  it('misses above the panels and returns the nearest when two line up', () => {
    const lead = AGENT_PANELS.find((p) => p.agentId === 'lead')!
    const high: Vec3 = [0, lead.position[1] + lead.size[1], lead.position[2]]
    expect(
      pickPanel({ origin: HERO_CAMERA.position, direction: toward(HERO_CAMERA.position, high) }, AGENT_PANELS),
    ).toBeNull()
    const front = { ...lead, agentId: 'front', position: [0, lead.position[1], lead.position[2] + 1] as Vec3 }
    const ray = { origin: HERO_CAMERA.position, direction: toward(HERO_CAMERA.position, lead.position) }
    expect(pickPanel(ray, [lead, front])).toBe('front')
  })

  it('ignores a ray pointing away', () => {
    const lead = AGENT_PANELS.find((p) => p.agentId === 'lead')!
    expect(pickPanel({ origin: HERO_CAMERA.position, direction: [0, 0, 1] }, [lead])).toBeNull()
  })
})

describe('tap detection', () => {
  it('treats small movement as a tap and a scroll as not', () => {
    expect(isTap({ x: 10, y: 10 }, { x: 13, y: 12 })).toBe(true)
    expect(isTap({ x: 10, y: 10 }, { x: 10, y: 40 })).toBe(false)
  })
})

describe('scene target', () => {
  it('accepts the bare page and chapter sections, not content', () => {
    const el = (tagName: string, hit = false) => ({ tagName, matches: () => hit })
    expect(isSceneTarget(el('BODY'))).toBe(true)
    expect(isSceneTarget(el('MAIN'))).toBe(true)
    expect(isSceneTarget(el('SECTION', true))).toBe(true)
    expect(isSceneTarget(el('BUTTON'))).toBe(false)
    expect(isSceneTarget(el('DIV'))).toBe(false)
    expect(isSceneTarget(null)).toBe(false)
  })
})
