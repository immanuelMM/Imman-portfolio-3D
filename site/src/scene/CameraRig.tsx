import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import type { PerspectiveCamera } from 'three'
import { agentCards } from '../lib/agentCards'
import { focusPose, poseAt, poseKindFor, reducedPose, resolvePose, type ResolvedPose } from './cameraPoses'
import type { ChapterState } from './chapterProgress'
import { NO_REFLECTION_LAYER } from './layers'
import { normalizePointer, parallaxActive, parallaxTarget } from './parallax'
import { AGENT_PANELS, AGENT_PANELS_TALL } from './layout'

/** How fast the camera settles on its target pose (1/s): about a second to arrive. */
const RATE = 3.2

const SCALARS = ['fov', 'offsetX', 'offsetY'] as const

function distance(a: ResolvedPose, b: ResolvedPose): number {
  let sum = Math.hypot(a.fov - b.fov, a.offsetX - b.offsetX, a.offsetY - b.offsetY)
  for (let i = 0; i < 3; i++) sum += Math.abs(a.position[i] - b.position[i]) + Math.abs(a.target[i] - b.target[i])
  return sum
}

/** `#scene[data-camera]` = settled | moving, for tests and screenshots (written only when it changes). */
let lastSignal = ''
function signal(settled: boolean) {
  const value = settled ? 'settled' : 'moving'
  if (value === lastSignal) return
  lastSignal = value
  const scene = document.getElementById('scene')
  if (scene) scene.dataset.camera = value
}

/**
 * The camera. Each frame it eases toward the pose of the current chapter (blended by scroll progress), or toward the open
 * agent's panel while its detail card is up. Reduced motion pins the About pose and never moves. The subject is moved
 * off-centre with `setViewOffset`, not by moving the camera, so the perspective stays that of a centred shot.
 */
export default function CameraRig({ chapter, motion }: { chapter: RefObject<ChapterState>; motion: boolean }) {
  const camera = useThree((s) => s.camera) as PerspectiveCamera
  const size = useThree((s) => s.size)
  const invalidate = useThree((s) => s.invalidate)
  const selected = useRef<string | null>(agentCards.get().agentId)
  const current = useRef<ResolvedPose | null>(null)
  // Pointer parallax (mouse only): where the pointer is (-1..1) and the eased camera drift in metres.
  const pointer = useRef<[number, number]>([0, 0])
  const drift = useRef<[number, number]>([0, 0])
  const finePointer = useRef(false)

  useEffect(() => {
    const query = window.matchMedia('(hover: hover) and (pointer: fine)')
    finePointer.current = query.matches
    const onChange = () => {
      finePointer.current = query.matches
    }
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || !finePointer.current) return
      pointer.current = normalizePointer(e.clientX, e.clientY, window.innerWidth, window.innerHeight)
    }
    query.addEventListener('change', onChange)
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => {
      query.removeEventListener('change', onChange)
      window.removeEventListener('pointermove', onMove)
    }
  }, [])

  useEffect(
    () =>
      agentCards.subscribe((state) => {
        selected.current = state.agentId
        invalidate()
      }),
    [invalidate],
  )

  const desired = (): ResolvedPose => {
    const aspect = size.width / size.height
    const kind = poseKindFor(aspect)
    if (!motion) return resolvePose(reducedPose(kind), aspect)
    const panels = kind === 'portrait' ? AGENT_PANELS_TALL : AGENT_PANELS
    const panel = selected.current ? panels.find((p) => p.agentId === selected.current) : undefined
    const { chapter: id, t } = chapter.current ?? { chapter: 'about' as const, t: 0 }
    return resolvePose(panel ? focusPose(panel, kind) : poseAt(id, t, kind), aspect)
  }

  const apply = (pose: ResolvedPose) => {
    const { width, height } = size
    camera.fov = pose.fov
    camera.position.set(...pose.position)
    camera.lookAt(...pose.target)
    // parallax: slide the camera sideways/up without turning it, so near and far things shift against each other
    camera.translateX(drift.current[0])
    camera.translateY(drift.current[1])
    if (pose.offsetX === 0 && pose.offsetY === 0) camera.clearViewOffset()
    else camera.setViewOffset(width, height, -pose.offsetX * height, pose.offsetY * height, width, height)
    camera.updateProjectionMatrix()
  }

  // The main view draws the no-reflection layer too (the mirror floor's own camera does not).
  useLayoutEffect(() => {
    camera.layers.enable(NO_REFLECTION_LAYER)
  }, [camera])

  // Snap (no easing) on mount, on a resize and when motion is switched, so the first frame is already in place.
  useLayoutEffect(() => {
    current.current = desired()
    apply(current.current)
    signal(true)
    invalidate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camera, size, motion, invalidate])

  useFrame((_, dt) => {
    if (!motion) return
    const from = current.current
    if (!from) return
    const to = desired()
    const k = 1 - Math.exp(-Math.min(dt, 0.25) * RATE)
    const [wantX, wantY] = parallaxTarget(
      pointer.current[0],
      pointer.current[1],
      parallaxActive({ finePointer: finePointer.current, motion, cardOpen: selected.current !== null }),
    )
    const kd = 1 - Math.exp(-Math.min(dt, 0.25) * 2.5)
    drift.current = [
      drift.current[0] + (wantX - drift.current[0]) * kd,
      drift.current[1] + (wantY - drift.current[1]) * kd,
    ]
    const next: ResolvedPose = {
      position: [0, 1, 2].map(
        (i) => from.position[i] + (to.position[i] - from.position[i]) * k,
      ) as ResolvedPose['position'],
      target: [0, 1, 2].map((i) => from.target[i] + (to.target[i] - from.target[i]) * k) as ResolvedPose['target'],
      fov: from.fov,
      offsetX: from.offsetX,
      offsetY: from.offsetY,
    }
    for (const key of SCALARS) next[key] = from[key] + (to[key] - from[key]) * k
    current.current = next
    apply(next)
    signal(distance(next, to) < 0.004)
  })
  return null
}
