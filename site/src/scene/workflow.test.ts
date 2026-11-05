import { describe, expect, it } from 'vitest'
import { agents } from '../data/agents'
import { activeAgents, pulseLevel, WORKFLOW_PERIOD } from './workflow'

describe('workflow pulse', () => {
  it('has a 6 second period', () => {
    expect(WORKFLOW_PERIOD).toBe(6)
  })

  it('lights Lead, Planner, Backend + Frontend, QA, Docs, DevOps in that order', () => {
    const order = [0.2, 1.2, 2.2, 3.2, 4.2, 5.2].map((t) => activeAgents(t))
    expect(order).toEqual([['lead'], ['planner'], ['backend', 'frontend'], ['qa'], ['docs'], ['devops']])
  })

  it('repeats every 6 seconds and handles negative time', () => {
    for (const t of [0.4, 2.7, 5.9]) expect(activeAgents(t + 6)).toEqual(activeAgents(t))
    expect(activeAgents(-0.5)).toEqual(['devops'])
  })

  it('pulses an agent most at the start of its own step', () => {
    expect(pulseLevel('qa', 3.12)).toBeCloseTo(1)
    expect(pulseLevel('qa', 3.0)).toBeCloseTo(0)
    expect(pulseLevel('backend', 2.12)).toBeCloseTo(pulseLevel('frontend', 2.12))
    expect(pulseLevel('qa', 2.5)).toBe(0)
    expect(pulseLevel('nobody', 1)).toBe(0)
  })

  it('stays within 0..1 for every agent at all times', () => {
    for (const a of agents)
      for (let t = 0; t < 12; t += 0.05) {
        const v = pulseLevel(a.id, t)
        expect(v).toBeGreaterThanOrEqual(0)
        expect(v).toBeLessThanOrEqual(1)
      }
  })
})
