import { describe, expect, it } from 'vitest'
import { CHAPTER_POSES, focusPose, poseAt, poseKindFor, reducedPose, resolvePose, type PoseKind } from './cameraPoses'
import { CHAPTER_IDS } from './chapters'
import { AGENT_PANELS, heroPoseFor } from './layout'

const KINDS: PoseKind[] = ['landscape', 'portrait']

const dist = (a: number[], b: number[]) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])

describe('chapter camera poses', () => {
  it('has a landscape and a portrait pose for every chapter', () => {
    for (const id of CHAPTER_IDS)
      for (const kind of KINDS) {
        const pose = CHAPTER_POSES[id][kind]
        expect(pose.position).toHaveLength(3)
        expect(pose.target).toHaveLength(3)
        expect(pose.fov).toBeGreaterThan(20)
      }
  })

  it('gives every portrait pose a horizontal half-angle to fit', () => {
    for (const id of CHAPTER_IDS) expect(CHAPTER_POSES[id].portrait.hHalf).toBeGreaterThan(10)
  })

  it('keeps every camera inside the room, facing into it', () => {
    for (const id of CHAPTER_IDS)
      for (const kind of KINDS) {
        const { position, target } = CHAPTER_POSES[id][kind]
        expect(Math.abs(position[0])).toBeLessThan(6.4)
        expect(position[1]).toBeGreaterThan(1)
        expect(position[1]).toBeLessThan(3.6)
        expect(position[2]).toBeLessThan(11)
        expect(target[2]).toBeLessThan(position[2])
      }
  })

  it('is continuous: neither position, target nor fov jumps (< 0.05) per 0.001 of progress', () => {
    for (const kind of KINDS)
      for (let c = 0; c < CHAPTER_IDS.length; c++) {
        let prev = poseAt(CHAPTER_IDS[c], 0, kind)
        for (let step = 1; step <= 1000; step++) {
          const next = poseAt(CHAPTER_IDS[c], step / 1000, kind)
          expect(dist(prev.position, next.position)).toBeLessThan(0.05)
          expect(dist(prev.target, next.target)).toBeLessThan(0.05)
          expect(Math.abs(prev.fov - next.fov)).toBeLessThan(0.05)
          prev = next
        }
      }
  })

  it('joins chapters without a jump: the end of one is the start of the next', () => {
    for (const kind of KINDS)
      for (let c = 0; c < CHAPTER_IDS.length - 1; c++) {
        const end = poseAt(CHAPTER_IDS[c], 1, kind)
        const start = poseAt(CHAPTER_IDS[c + 1], 0, kind)
        expect(dist(end.position, start.position)).toBeLessThan(1e-9)
        expect(dist(end.target, start.target)).toBeLessThan(1e-9)
      }
  })

  it('rests on a chapter pose at the start of its span and holds the last pose', () => {
    expect(poseAt('ai', 0, 'landscape')).toMatchObject({ position: CHAPTER_POSES.ai.landscape.position })
    expect(poseAt('contact', 0.9, 'portrait').position).toEqual(CHAPTER_POSES.contact.portrait.position)
  })

  it('pins reduced motion to the about pose', () => {
    for (const kind of KINDS) expect(reducedPose(kind)).toBe(CHAPTER_POSES.about[kind])
  })

  it('keeps the about pose equal to the S1 hero framing', () => {
    for (const aspect of [1.6, 0.46, 0.7]) {
      const kind = poseKindFor(aspect)
      const resolved = resolvePose(CHAPTER_POSES.about[kind], aspect)
      const hero = heroPoseFor(aspect)
      expect(resolved.position).toEqual(hero.position)
      expect(resolved.fov).toBeCloseTo(hero.fov, 6)
      expect(resolved.offsetX).toBeCloseTo(hero.offsetX, 6)
      expect(resolved.offsetY).toBeCloseTo(hero.offsetY, 6)
    }
  })

  it('focuses a panel from in front of it, inside the room, on both layouts', () => {
    for (const panel of AGENT_PANELS)
      for (const kind of KINDS) {
        const pose = focusPose(panel, kind)
        expect(Math.abs(pose.position[0])).toBeLessThan(6.4)
        expect(pose.position[2]).toBeGreaterThan(panel.position[2])
        expect(pose.target[0]).toBeCloseTo(panel.position[0])
        expect(dist(pose.position, panel.position)).toBeGreaterThan(3)
      }
  })
})
