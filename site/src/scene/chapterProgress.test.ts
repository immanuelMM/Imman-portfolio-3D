import { describe, expect, it } from 'vitest'
import { chapterProgress, type ChapterAnchor } from './chapterProgress'
import { CHAPTER_IDS } from './chapters'

const anchors: ChapterAnchor[] = CHAPTER_IDS.map((id, i) => ({ id, top: i * 1000 }))

describe('chapterProgress', () => {
  it('knows the six chapters in page order', () => {
    expect(CHAPTER_IDS).toEqual(['about', 'experience', 'ai', 'web', 'education', 'contact'])
  })

  it('starts at about with t = 0', () => {
    expect(chapterProgress(0, 800, anchors)).toEqual({ chapter: 'about', t: 0 })
  })

  it('is about half way between two anchors', () => {
    const r = chapterProgress(1500, 800, anchors)
    expect(r.chapter).toBe('experience')
    expect(r.t).toBeCloseTo(0.5)
  })

  it('reports progress through a middle chapter', () => {
    const r = chapterProgress(3250, 800, anchors)
    expect(r.chapter).toBe('web')
    expect(r.t).toBeCloseTo(0.25)
  })

  it('walks every chapter', () => {
    CHAPTER_IDS.forEach((id, i) => expect(chapterProgress(i * 1000 + 10, 800, anchors).chapter).toBe(id))
  })

  it('stays in the last chapter at t = 1 past the end', () => {
    expect(chapterProgress(99000, 800, anchors)).toEqual({ chapter: 'contact', t: 1 })
  })

  it('spans the last chapter up to the end anchor when there is one', () => {
    expect(chapterProgress(5500, 800, anchors, 6000).t).toBeCloseTo(0.5)
    expect(chapterProgress(7500, 800, anchors, 6000)).toEqual({ chapter: 'contact', t: 1 })
  })

  it('falls back to one viewport when the end anchor is above the last chapter', () => {
    expect(chapterProgress(5400, 800, anchors, 100).t).toBeCloseTo(0.5)
  })

  it('handles an empty anchor list and negative scroll', () => {
    expect(chapterProgress(500, 800, [])).toEqual({ chapter: 'about', t: 0 })
    expect(chapterProgress(-40, 800, anchors)).toEqual({ chapter: 'about', t: 0 })
  })
})
