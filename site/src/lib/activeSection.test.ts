import { describe, expect, it } from 'vitest'
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

  it('activates a section once its top passes the reading line (40% of the viewport)', () => {
    expect(pickActive(380, 800, sections)).toBe('experience')
    expect(pickActive(379, 800, sections)).toBeNull()
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
