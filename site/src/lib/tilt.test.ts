import { describe, expect, it } from 'vitest'
import { glassEnabled, glassPointer, MAX_TILT } from './tilt'

const rect = { left: 100, top: 200, width: 400, height: 300 }

describe('glassPointer', () => {
  it('is flat in the middle and tilts at most 4 degrees at the corners', () => {
    const middle = glassPointer(rect, 300, 350)
    expect(middle.rx).toBeCloseTo(0)
    expect(middle.ry).toBeCloseTo(0)
    expect([middle.mx, middle.my]).toEqual([50, 50])
    const corner = glassPointer(rect, 500, 500)
    expect(corner.ry).toBe(MAX_TILT)
    expect(corner.rx).toBe(-MAX_TILT)
    expect(MAX_TILT).toBeLessThanOrEqual(4)
  })

  it('leans toward the cursor: right edge turns ry positive, top edge rx positive', () => {
    expect(glassPointer(rect, 500, 350).ry).toBeGreaterThan(0)
    expect(glassPointer(rect, 100, 350).ry).toBeLessThan(0)
    expect(glassPointer(rect, 300, 200).rx).toBeGreaterThan(0)
  })

  it('clamps a pointer outside the card and survives an empty rect', () => {
    expect(glassPointer(rect, 5000, -5000)).toMatchObject({ ry: MAX_TILT, rx: MAX_TILT, mx: 100, my: 0 })
    expect(glassPointer({ left: 0, top: 0, width: 0, height: 0 }, 5, 5).mx).toBe(50)
  })
})

describe('glassEnabled', () => {
  it('needs a fine pointer and no reduced motion', () => {
    expect(glassEnabled(true, false)).toBe(true)
    expect(glassEnabled(false, false)).toBe(false)
    expect(glassEnabled(true, true)).toBe(false)
  })
})
