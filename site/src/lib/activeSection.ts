export interface SectionTop {
  id: string
  top: number
}

/** The section whose top has passed the reading line (40% down the viewport); null while still in the hero. */
export function pickActive(
  scrollY: number,
  viewportH: number,
  sections: SectionTop[],
  atBottom = false,
): string | null {
  const sorted = [...sections].sort((a, b) => a.top - b.top)
  // A last section too short to reach the reading line is still the one in view at the end of the page.
  if (atBottom && sorted.length > 0) return sorted[sorted.length - 1].id
  const line = scrollY + viewportH * 0.4
  let active: string | null = null
  for (const s of sorted) {
    if (s.top <= line) active = s.id
  }
  return active
}

/** The scene dims to 30% and pauses once the footer (past the contact section) is half way up the screen. */
export function isFaded(scrollY: number, viewportH: number, endTop: number | null): boolean {
  return endTop !== null && endTop <= scrollY + viewportH * 0.5
}
