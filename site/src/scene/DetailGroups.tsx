import { lazy, Suspense, useEffect, useState, type RefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import type { QualityTier } from '../lib/quality'
import type { ChapterState } from './chapterProgress'
import { CHAPTER_IDS, type ChapterId } from './chapters'

const ProjectScreens = lazy(() => import('./ProjectScreens'))
const ArchiveDisplay = lazy(() => import('./ArchiveDisplay'))

/**
 * A detail group is wanted from the chapter before its own on (current or next): the project screens (for `#web`) from
 * `#ai` on, the archive display (for `#education`) from `#web` on. Mounted groups stay mounted; this also says when to draw them.
 */
export function groupsWanted(chapter: ChapterId): { screens: boolean; archive: boolean } {
  const i = CHAPTER_IDS.indexOf(chapter)
  return { screens: i >= CHAPTER_IDS.indexOf('ai'), archive: i >= CHAPTER_IDS.indexOf('web') }
}

/**
 * The lazy detail groups, each with its own Suspense boundary so a slow texture never holds the rest of the room. Lights are
 * not here: they all live in the first-frame group. A group is drawn only while its chapter's view can use it (so the hero
 * view stays at the S1 draw-call count) and is never mounted under reduced motion (the camera never leaves the hero pose).
 */
export default function DetailGroups({
  tier,
  chapter,
  motion,
}: {
  tier: QualityTier
  chapter: RefObject<ChapterState>
  motion: boolean
}) {
  const invalidate = useThree((s) => s.invalidate)
  const [state, setState] = useState<{ chapter: ChapterId; screens: boolean; archive: boolean }>({
    chapter: 'about',
    screens: false,
    archive: false,
  })
  useFrame(() => {
    if (!motion) return
    const id = chapter.current?.chapter ?? 'about'
    const want = groupsWanted(id)
    setState((now) => {
      const screens = now.screens || want.screens
      const archive = now.archive || want.archive
      return id === now.chapter && screens === now.screens && archive === now.archive
        ? now
        : { chapter: id, screens, archive }
    })
  })
  useEffect(() => invalidate(), [invalidate, state])
  const show = groupsWanted(state.chapter)
  return (
    <>
      {state.screens && (
        <Suspense fallback={null}>
          <ProjectScreens tier={tier} visible={show.screens} />
        </Suspense>
      )}
      {state.archive && (
        <Suspense fallback={null}>
          <ArchiveDisplay visible={show.archive} />
        </Suspense>
      )}
    </>
  )
}
