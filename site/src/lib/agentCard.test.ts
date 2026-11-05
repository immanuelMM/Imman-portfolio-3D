import { describe, expect, it, vi } from 'vitest'
import { createAgentCardStore } from './agentCard'

const IDS = ['lead', 'planner', 'qa']

describe('agent card store', () => {
  it('starts closed, opens an agent and closes again', () => {
    const store = createAgentCardStore(IDS)
    expect(store.get().agentId).toBeNull()
    store.open('planner')
    expect(store.get().agentId).toBe('planner')
    store.close()
    expect(store.get().agentId).toBeNull()
  })

  it('ignores unknown ids', () => {
    const store = createAgentCardStore(IDS)
    store.open('nobody')
    expect(store.get().agentId).toBeNull()
  })

  it('notifies subscribers once per real change and stops after unsubscribe', () => {
    const store = createAgentCardStore(IDS)
    const listener = vi.fn()
    const off = store.subscribe(listener)
    store.open('lead')
    store.open('lead')
    store.close()
    store.close()
    expect(listener).toHaveBeenCalledTimes(2)
    expect(listener).toHaveBeenLastCalledWith({ agentId: null })
    off()
    store.open('qa')
    expect(listener).toHaveBeenCalledTimes(2)
  })

  it('keeps the first trigger while switching agents, and drops it after close', () => {
    const store = createAgentCardStore(IDS)
    const first = {} as HTMLElement
    const second = {} as HTMLElement
    store.open('lead', first)
    store.open('planner', second)
    expect(store.trigger()).toBe(first)
    store.close()
    store.open('qa', second)
    expect(store.trigger()).toBe(second)
  })
})
