/**
 * Expand state of a list of collapsible entries (the experience timeline). The page is rendered fully open (no content is
 * lost without JavaScript); the eager script collapses everything but the first entry, then toggles on click or Enter.
 */
export function initialExpanded(count: number, firstOpen = true): boolean[] {
  return Array.from({ length: count }, (_, i) => firstOpen && i === 0)
}

/** A new state with entry `index` flipped (other entries keep theirs: several may be open). */
export function toggleAt(state: readonly boolean[], index: number): boolean[] {
  if (index < 0 || index >= state.length) return [...state]
  return state.map((open, i) => (i === index ? !open : open))
}
