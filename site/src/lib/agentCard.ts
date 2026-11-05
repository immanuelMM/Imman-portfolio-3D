/**
 * Which agent's detail card is open. A tiny framework-free store shared by the DOM buttons and dialog (eager script) and
 * the 3D panels (lazy scene): both call the same `open`, so a click on a panel and a press on a button give the same card.
 */
export interface AgentCardState {
  /** the open agent, or null when the card is closed */
  agentId: string | null
}

export interface AgentCardStore {
  get(): AgentCardState
  /** Opens (or switches to) an agent's card. `trigger` is where focus returns to on close; kept from the first open. */
  open(agentId: string, trigger?: HTMLElement | null): void
  close(): void
  /** Returns the element focus should go back to, if still usable. */
  trigger(): HTMLElement | null
  subscribe(listener: (state: AgentCardState) => void): () => void
}

export function createAgentCardStore(validIds: readonly string[]): AgentCardStore {
  let state: AgentCardState = { agentId: null }
  let trigger: HTMLElement | null = null
  const listeners = new Set<(state: AgentCardState) => void>()
  const set = (next: AgentCardState) => {
    if (next.agentId === state.agentId) return
    state = next
    listeners.forEach((l) => l(state))
  }
  return {
    get: () => state,
    open(agentId, from) {
      if (!validIds.includes(agentId)) return
      if (state.agentId === null) trigger = from ?? null
      set({ agentId })
    },
    close() {
      set({ agentId: null })
    },
    trigger: () => trigger,
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}
