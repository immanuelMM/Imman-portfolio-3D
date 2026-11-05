import { CHAPTER_IDS, CHAPTER_SIDES, type ChapterId } from './chapters'
import { HERO_CAMERA, SHIFT_REF_ASPECT, type AgentPanelSpec, type Vec3 } from './layout'

/**
 * One camera framing. `shiftX` moves the subject right by that fraction of 1.6 x the viewport height (`SHIFT_REF_ASPECT`;
 * landscape: room for the content column) and `shiftY` up by that fraction of the height (portrait: subject above the cards), both via
 * `camera.setViewOffset` so the perspective stays that of a centred shot. Portrait poses give `hHalf`, the horizontal
 * half-angle (degrees) the shot must fit, from which the vertical fov follows the aspect.
 */
export interface ScenePose {
  position: Vec3
  target: Vec3
  fov: number
  shiftX: number
  shiftY: number
  hHalf?: number
}

export interface ResolvedPose {
  position: Vec3
  target: Vec3
  fov: number
  /** setViewOffset arguments as fractions of the viewport height (x) and height (y) */
  offsetX: number
  offsetY: number
}

export type PoseKind = 'landscape' | 'portrait'

/** Landscape pose: the subject is shifted into the half opposite the card (card left -> subject right, positive shift). */
const L = (chapter: ChapterId, position: Vec3, target: Vec3, fov: number): ScenePose => ({
  position,
  target,
  fov,
  shiftX: CHAPTER_SIDES[chapter] === 'left' ? 0.235 : -0.235,
  shiftY: 0,
})
const P = (position: Vec3, target: Vec3, hHalf: number, shiftY = 0.16): ScenePose => ({
  position,
  target,
  fov: 60,
  hHalf,
  shiftX: 0,
  shiftY,
})

/**
 * The camera pose of every chapter, landscape and portrait. About is the S1 hero shot. The camera only dollies and pans
 * (no cuts): along the left rack aisle, into the agent arc, up to the project screens on the back wall, across to the
 * archive display beside the console, and back up for an overview.
 */
export const CHAPTER_POSES: Record<ChapterId, Record<PoseKind, ScenePose>> = {
  about: {
    landscape: L('about', HERO_CAMERA.position, HERO_CAMERA.target, HERO_CAMERA.fov),
    portrait: P([0, 2.0, 7.6], [0, 1.3, -3], 24),
  },
  experience: {
    landscape: L('experience', [1.2, 1.7, 2.2], [-4.15, 1.55, 1.0], 40),
    portrait: P([-1.0, 1.75, 5.6], [-3.4, 1.5, 0.6], 27),
  },
  ai: {
    landscape: L('ai', [0, 1.7, 8.8], [0, 1.35, -3.0], 38),
    portrait: P([0, 1.9, 7.4], [0, 1.3, -3], 24),
  },
  web: {
    landscape: L('web', [0.4, 2.5, 6.3], [0, 2.25, -6.0], 38),
    portrait: P([0.4, 2.6, 4.2], [0, 2.9, -6.0], 26, 0.2),
  },
  education: {
    landscape: L('education', [0.8, 2.3, 7.6], [-1.8, 1.5, 3.0], 38),
    portrait: P([0.6, 2.3, 7.4], [-1.4, 1.5, 3.2], 27),
  },
  contact: {
    landscape: L('contact', [0, 3.2, 10.8], [0, 1.2, -2.5], 42),
    portrait: P([0, 3.0, 9.4], [0, 1.2, -3], 25, 0.14),
  },
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const lerp3 = (a: Vec3, b: Vec3, t: number): Vec3 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]
const smooth = (t: number) => t * t * (3 - 2 * t)

export function blendPoses(a: ScenePose, b: ScenePose, t: number): ScenePose {
  return {
    position: lerp3(a.position, b.position, t),
    target: lerp3(a.target, b.target, t),
    fov: lerp(a.fov, b.fov, t),
    shiftX: lerp(a.shiftX, b.shiftX, t),
    shiftY: lerp(a.shiftY, b.shiftY, t),
    hHalf: a.hHalf !== undefined && b.hHalf !== undefined ? lerp(a.hHalf, b.hHalf, t) : undefined,
  }
}

/** The camera rests on a chapter's pose for this first share of its scroll span, then glides to the next chapter's. */
export const HOLD = 0.3

/**
 * The pose for a scroll position: chapter `i` at progress `t` (0..1). Continuous across chapter boundaries (t = 1 of one
 * chapter is t = 0 of the next). The last chapter holds its pose.
 */
export function poseAt(chapter: ChapterId, t: number, kind: PoseKind): ScenePose {
  const i = CHAPTER_IDS.indexOf(chapter)
  const here = CHAPTER_POSES[chapter][kind]
  const next = CHAPTER_IDS[i + 1]
  if (!next) return here
  const k = Math.min(1, Math.max(0, (t - HOLD) / (1 - HOLD)))
  return blendPoses(here, CHAPTER_POSES[next][kind], smooth(k))
}

/** Reduced motion pins the camera to the About (hero) pose whatever the scroll position. */
export function reducedPose(kind: PoseKind): ScenePose {
  return CHAPTER_POSES.about[kind]
}

export function poseKindFor(aspect: number): PoseKind {
  return aspect < 0.95 ? 'portrait' : 'landscape'
}

/** Turns a pose into camera numbers for a viewport aspect. Aspects 0.95-1.15 get no horizontal shift (a squarish window). */
export function resolvePose(pose: ScenePose, aspect: number): ResolvedPose {
  const fov =
    pose.hHalf !== undefined
      ? Math.min(70, (2 * Math.atan(Math.tan((pose.hHalf * Math.PI) / 180) / aspect) * 180) / Math.PI)
      : pose.fov
  const shiftX = aspect >= 1.15 ? pose.shiftX : 0
  return { position: pose.position, target: pose.target, fov, offsetX: shiftX * SHIFT_REF_ASPECT, offsetY: pose.shiftY }
}

/**
 * The framing while a detail card is open: the camera stands in front of the panel (along its normal) and the panel sits
 * beside the card, not behind it: left of centre on a wide screen (card on the right), in the top part on a phone
 * (card is a bottom sheet).
 */
export function focusPose(panel: AgentPanelSpec, kind: PoseKind): ScenePose {
  const nx = Math.sin(panel.rotationY)
  const nz = Math.cos(panel.rotationY)
  const [px, py, pz] = panel.position
  const distance = kind === 'portrait' ? 4.2 : 4.4
  return {
    position: [px + nx * distance, py + 0.15, pz + nz * distance],
    target: [px, py - 0.05, pz],
    fov: 40,
    hHalf: kind === 'portrait' ? 17 : undefined,
    shiftX: kind === 'portrait' ? 0 : -0.2,
    shiftY: kind === 'portrait' ? 0.2 : 0,
  }
}
