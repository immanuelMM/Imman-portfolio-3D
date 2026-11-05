import type { Chapter, ChapterAnchor } from '../scene/chapterProgress'

/**
 * Shared by the eager vibe script and the lazy scene so both agree on where a chapter starts: when its section
 * reaches the middle of the screen, not when it touches the top.
 */
export function readAnchors(): ChapterAnchor[] {
  return Array.from(document.querySelectorAll<HTMLElement>('[data-chapter]')).map((el) => ({
    id: el.dataset.chapter as Chapter,
    top: el.getBoundingClientRect().top + window.scrollY - window.innerHeight * 0.5,
  }))
}

/** Where the last chapter ends: the first `[data-chapter-end]` element (the footer). */
export function readEnd(): number | undefined {
  const el = document.querySelector<HTMLElement>('[data-chapter-end]')
  return el ? el.getBoundingClientRect().top + window.scrollY - window.innerHeight * 0.5 : undefined
}
