import { describe, expect, it } from 'vitest'
import { agentDetail } from './agentDetail'
import { agents, WORKFLOW_STEPS } from './agents'

describe('agent detail content', () => {
  it('has a card for every agent, taken from agents.ts', () => {
    for (const agent of agents) {
      const d = agentDetail(agent.id)!
      expect(d.name).toBe(agent.name)
      expect(d.role).toBe(agent.role)
      expect(d.tools).toEqual(agent.tools ?? [])
    }
    expect(agentDetail('nobody')).toBeNull()
  })

  it('covers every agent exactly once in the workflow steps', () => {
    expect(WORKFLOW_STEPS.flat().sort()).toEqual(agents.map((a) => a.id).sort())
  })

  it('numbers the steps Lead 1 .. DevOps 6 with Backend and Frontend sharing step 3', () => {
    expect(
      ['lead', 'planner', 'backend', 'frontend', 'qa', 'docs', 'devops'].map((id) => agentDetail(id)!.step),
    ).toEqual([1, 2, 3, 3, 4, 5, 6])
    expect(agentDetail('backend')!.stepLabel).toBe('Step 3 of 6, in parallel with React Frontend')
    expect(agentDetail('qa')!.stepLabel).toBe('Step 4 of 6')
  })

  it('links hand-offs: Planner hands to both builders, QA takes over from both', () => {
    expect(agentDetail('planner')!.handsTo).toEqual(['.NET Backend', 'React Frontend'])
    expect(agentDetail('qa')!.receivesFrom).toEqual(['.NET Backend', 'React Frontend'])
    expect(agentDetail('lead')!.receivesFrom).toEqual([])
    expect(agentDetail('devops')!.handsTo).toEqual([])
  })

  it('chains previous and next in pipeline order', () => {
    expect(agentDetail('lead')!.prev).toBeNull()
    expect(agentDetail('lead')!.next).toBe('planner')
    expect(agentDetail('devops')!.next).toBeNull()
    expect(agentDetail('devops')!.prev).toBe('docs')
  })
})
