import { useEffect, useRef, type RefObject } from 'react'
import { useThree } from '@react-three/fiber'
import { readAnchors, readEnd } from '../lib/chapterAnchors'
import { chapterProgress, type ChapterState } from './chapterProgress'
import { CHAPTER_IDS } from './chapters'

/**
 * Native document scroll -> chapter progress, written into a ref that the render loop reads. A passive scroll
 * listener plus one rAF per frame; it never touches scroll position, so anchors and touch scrolling stay native.
 * Under reduced motion the canvas draws on demand, so it asks for a frame only when the chapter changes.
 */
export function useChapter(): RefObject<ChapterState> {
  const state = useRef<ChapterState>({ chapter: CHAPTER_IDS[0], t: 0 })
  const invalidate = useThree((s) => s.invalidate)

  useEffect(() => {
    let anchors = readAnchors()
    let end = readEnd()
    let frame = 0
    const update = () => {
      frame = 0
      const before = state.current
      const next = chapterProgress(window.scrollY, window.innerHeight, anchors, end)
      state.current = next
      if (next.chapter !== before.chapter) invalidate()
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    const onResize = () => {
      anchors = readAnchors()
      end = readEnd()
      schedule()
    }
    update()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', onResize, { passive: true })
    return () => {
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', onResize)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [invalidate])

  return state
}
