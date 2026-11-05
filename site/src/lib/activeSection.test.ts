import { describe, expect, it } from 'vitest'
import { CHAPTER_IDS } from '../scene/chapters'
import { chapterProgress } from '../scene/chapterProgress'
import { isFaded, pickActive } from './activeSection'

const sections = [
  { id: 'experience', top: 700 },
  { id: 'ai', top: 2400 },
  { id: 'web', top: 3600 },
  { id: 'education', top: 5200 },
  { id: 'contact', top: 5900 },
]

describe('pickActive', () => {
  it('has no active link in the hero', () => {
    expect(pickActive(0, 800, sections)).toBeNull()
  })

  it('activates a section once its top passes the reading line (half way down the viewport)', () => {
    expect(pickActive(300, 800, sections)).toBe('experience')
    expect(pickActive(299, 800, sections)).toBeNull()
  })

  it('names the same chapter as the camera (chapterProgress) at every scroll position', () => {
    const h = 900
    const tops = CHAPTER_IDS.map((id, i) => ({ id, top: i === 0 ? 0 : 900 + i * 1700 }))
    // the chapter anchors the scene uses: a section starts when its top reaches mid-screen
    const anchors = tops.map(({ id, top }) => ({ id, top: top - h * 0.5 }))
    for (let y = 0; y <= 10400; y += 25) {
      const camera = chapterProgress(y, h, anchors).chapter
      const nav = pickActive(y, h, tops)
      // in the hero, before About's own anchor, the camera is on About and no link is lit
      if (nav !== null) expect(nav).toBe(camera)
    }
    // the moment a section's top reaches mid-screen both switch together
    for (const { id, top } of tops.slice(1)) {
      expect(pickActive(top - h * 0.5, h, tops)).toBe(id)
      expect(chapterProgress(top - h * 0.5, h, anchors).chapter).toBe(id)
    }
  })

  it('activates the last section at the end of the page even if its top never reaches the line', () => {
    expect(pickActive(5300, 800, sections, true)).toBe('contact')
    expect(pickActive(5300, 800, sections)).toBe('education')
  })

  it('keeps the last section active past its top', () => {
    expect(pickActive(9000, 800, sections)).toBe('contact')
  })
})

describe('isFaded', () => {
  it('fades the scene once the footer is half way up the screen', () => {
    expect(isFaded(4000, 800, 5200)).toBe(false)
    expect(isFaded(4800, 800, 5200)).toBe(true)
  })

  it('does not fade when there is no footer', () => {
    expect(isFaded(9000, 800, null)).toBe(false)
  })
})
