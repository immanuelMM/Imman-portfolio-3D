import { CHAPTER_IDS, type ChapterId } from './chapters'

export type Chapter = ChapterId

export interface ChapterAnchor {
  id: Chapter
  top: number
}

export interface ChapterState {
  chapter: Chapter
  t: number
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n))

/**
 * Maps native document scroll to a chapter and progress through it. The last chapter ends at `end` (where the story
 * after it begins) when that is known, otherwise it spans one viewport height; either way it stays at t = 1 past it.
 */
export function chapterProgress(
  scrollY: number,
  viewportH: number,
  anchors: ChapterAnchor[],
  end?: number,
): ChapterState {
  if (anchors.length === 0) return { chapter: CHAPTER_IDS[0], t: 0 }
  const sorted = [...anchors].sort((a, b) => a.top - b.top)
  let index = 0
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i].top <= scrollY) index = i
  }
  const current = sorted[index]
  const next = sorted[index + 1]
  const lastSpan = end !== undefined && end > current.top ? end - current.top : viewportH
  const span = next ? next.top - current.top : Math.max(1, lastSpan)
  return { chapter: current.id, t: clamp01((scrollY - current.top) / span) }
}
