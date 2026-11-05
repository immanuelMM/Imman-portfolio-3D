import { describe, expect, it } from 'vitest'
import { normalizePointer, PARALLAX_RANGE, parallaxActive, parallaxTarget } from './parallax'

describe('pointer parallax', () => {
  it('maps the window corners to -1..1 with y up', () => {
    expect(normalizePointer(0, 0, 1000, 500)).toEqual([-1, 1])
    expect(normalizePointer(1000, 500, 1000, 500)).toEqual([1, -1])
    expect(normalizePointer(500, 250, 1000, 500)).toEqual([0, 0])
    expect(normalizePointer(5000, -50, 1000, 500)).toEqual([1, 1])
    expect(normalizePointer(10, 10, 0, 0)).toEqual([0, 0])
  })

  it('moves the camera toward the pointer by at most the range, and not at all when inactive', () => {
    expect(parallaxTarget(1, -1, true)).toEqual([PARALLAX_RANGE.x, -PARALLAX_RANGE.y])
    expect(parallaxTarget(0.5, 0, true)).toEqual([PARALLAX_RANGE.x * 0.5, 0])
    expect(parallaxTarget(3, 3, true)).toEqual([PARALLAX_RANGE.x, PARALLAX_RANGE.y])
    expect(parallaxTarget(1, 1, false)).toEqual([0, 0])
  })

  it('stays small (a few centimetres to ~20 cm)', () => {
    expect(PARALLAX_RANGE.x).toBeLessThan(0.25)
    expect(PARALLAX_RANGE.y).toBeLessThan(0.15)
  })

  it('runs only for a fine pointer, with motion, and no open card', () => {
    expect(parallaxActive({ finePointer: true, motion: true, cardOpen: false })).toBe(true)
    expect(parallaxActive({ finePointer: false, motion: true, cardOpen: false })).toBe(false)
    expect(parallaxActive({ finePointer: true, motion: false, cardOpen: false })).toBe(false)
    expect(parallaxActive({ finePointer: true, motion: true, cardOpen: true })).toBe(false)
  })
})
