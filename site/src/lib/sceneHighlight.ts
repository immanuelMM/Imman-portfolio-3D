/**
 * Which 3D object the page is pointing at: hovering, focusing or tapping an agent item or a project card in a chapter card
 * lights the matching holo panel or project screen in the room. A tiny framework-free store shared by the eager script
 * (`scripts/highlightLinks.ts`) and the lazy scene, like `agentCards`.
 */
export type SceneHighlight = { kind: 'agent'; id: string } | { kind: 'screen'; id: string } | null

/** The cell names of the project-screen atlas, in reading order (`public/screens/manifest.json`, `screensLayout.ts`). */
export const SCREEN_CELLS = [
  'fullstack-agent',
  'master-brd',
  'ba-reviewer',
  'n8n-workflow',
  'agentic-coding',
  'prompt-engineering',
] as const

/** Atlas cell of a project screen by its art name (`fullstack-agent`), or null when that project has no screen. */
export function screenIndex(name: string): number | null {
  const i = (SCREEN_CELLS as readonly string[]).indexOf(name)
  return i === -1 ? null : i
}

/** Reads a `data-hl` attribute: `agent:qa` or `screen:fullstack-agent`. Unknown kinds, agents and screens are ignored. */
export function parseHighlight(value: string | null | undefined, agentIds: readonly string[]): SceneHighlight {
  if (!value) return null
  const [kind, id] = value.split(':')
  if (kind === 'agent' && id && agentIds.includes(id)) return { kind, id }
  if (kind === 'screen' && id && screenIndex(id) !== null) return { kind, id }
  return null
}

export function sameHighlight(a: SceneHighlight, b: SceneHighlight): boolean {
  return a === b || (a !== null && b !== null && a.kind === b.kind && a.id === b.id)
}

export interface HighlightStore {
  get(): SceneHighlight
  set(next: SceneHighlight): void
  subscribe(listener: (value: SceneHighlight) => void): () => void
}

export function createHighlightStore(): HighlightStore {
  let value: SceneHighlight = null
  const listeners = new Set<(v: SceneHighlight) => void>()
  return {
    get: () => value,
    set(next) {
      if (sameHighlight(next, value)) return
      value = next
      listeners.forEach((l) => l(value))
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}
